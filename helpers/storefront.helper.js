/**
 * Shopify storefront helpers.
 *
 * Encapsulates the two universal "noise" concerns of a Shopify dev
 * storefront:
 *   1. The password gate (`/password`) on protected dev/staging shops.
 *   2. The OneTrust cookie consent banner that overlays the page on
 *      first visit and intercepts clicks.
 *
 * Both helpers are idempotent and safe to call on every navigation.
 */

const env = require('../config/env');
const logger = require('./logger');

/**
 * Cloudflare challenge / Bot Management interstitials.
 *
 * Bonobos DEV sits behind Cloudflare. When automation traffic looks
 * "non-human" the request is parked on a challenge page ("Just a moment…",
 * "Verifying you are human", Turnstile widget). Playwright then waits on a
 * URL/element that never appears and we time out at ~60s.
 *
 * Strategy:
 *   1) Detect — URL contains `/cdn-cgi/`, `__cf_chl_tk=`, title matches CF
 *      copy, or known CF DOM nodes are present.
 *   2) Wait — poll up to `CF_WAIT_MS` (default 90s) for the page to clear.
 *      In headed mode the operator can solve a Turnstile checkbox by hand
 *      inside that window; in headless we just wait for an auto-pass.
 *   3) Persist — `state/storageState.json` re-uses the issued
 *      `cf_clearance` cookie on the next scenario / run so subsequent
 *      navigations skip the challenge entirely.
 *
 * Returns `true` when a challenge was seen AND cleared, `false` when no
 * challenge was present, and `false` (with a warning) when the wait
 * window expires.
 *
 * @param {import('playwright').Page} page
 * @param {{ timeoutMs?: number }} [opts]
 */
async function waitForCloudflareChallenge(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? env.CF_WAIT_MS;

  const CF_DOM_SIGNALS = [
    'iframe[src*="challenges.cloudflare.com"]',
    'iframe[src*="turnstile"]',
    'iframe[title*="challenge" i]',
    '#challenge-running',
    '#challenge-form',
    '#cf-spinner-please-wait',
    'body.cf-browser-verification',
    'div.cf-challenge-container',
  ];

  const detectOnce = async () => {
    try {
      if (page.isClosed && page.isClosed()) return false;
    } catch {
      return false;
    }
    const url = page.url();
    if (/__cf_chl_tk=|cdn-cgi\/challenge-platform|\/cdn-cgi\/l\//i.test(url)) {
      return true;
    }
    let title = '';
    try {
      title = (await page.title()) || '';
    } catch {
      title = '';
    }
    if (
      /just a moment|attention required|verifying you are human|checking your browser|please wait\.\.\.|connection needs to be verified|verify you are human/i.test(
        title
      )
    ) {
      return true;
    }
    const cfCopy = page.getByText(/connection needs to be verified|verify you are human/i).first();
    if (await cfCopy.isVisible({ timeout: 400 }).catch(() => false)) return true;
    for (const sel of CF_DOM_SIGNALS) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 250 }).catch(() => false);
      if (visible) return true;
    }
    return false;
  };

  if (!(await detectOnce())) return false;

  logger.warn(
    `storefront: Cloudflare challenge detected — waiting up to ${timeoutMs}ms ` +
      `(${env.HEADLESS ? 'headless: waiting for auto-pass' : 'headed: solve the Turnstile if shown'})`
  );

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await detectOnce())) {
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 10_000 });
      } catch {
        /* page may not navigate, that's fine */
      }
      logger.action('storefront: Cloudflare challenge cleared');
      return true;
    }
    await page.waitForTimeout(1500);
  }
  logger.warn('storefront: Cloudflare challenge still present after wait window');
  return false;
}

/**
 * Unlock the storefront password gate if `STORE_PASSWORD` is set in env
 * AND the page is currently on the `/password` route. Safe to call on
 * every navigation — no-op if the gate is not present.
 *
 * Implementation notes:
 *   - We click the actual submit button rather than pressing Enter on
 *     the input. Some Shopify themes intercept Enter and never submit.
 *   - We wait on `domcontentloaded` (not `load`) because Bonobos pulls
 *     in many 3rd-party scripts and `load` can take 30s+.
 *
 * @param {import('playwright').Page} page
 */
async function unlockStorefront(page) {
  if (!env.STORE_PASSWORD) return;
  await waitForCloudflareChallenge(page);
  if (!page.url().includes('/password')) return;

  logger.action('storefront: unlocking password gate');

  const pwField = page.locator('input[type="password"]').first();
  await pwField.waitFor({ state: 'visible', timeout: 15_000 });
  await pwField.fill(env.STORE_PASSWORD);

  // Submit button label is "Enter" on Shopify dawn-style themes; some
  // themes use type=submit with no text. Try both, fall back to Enter
  // keypress if neither is present.
  const submitBtn = page
    .locator(
      'button:has-text("Enter"), button[type="submit"], form[action*="password"] button'
    )
    .first();

  const leavePassword = page.waitForURL(
    (u) => !u.toString().includes('/password'),
    { timeout: env.NAVIGATION_TIMEOUT, waitUntil: 'domcontentloaded' }
  );

  if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await Promise.all([
      leavePassword,
      submitBtn.click({ timeout: 15_000, noWaitAfter: true }),
    ]);
  } else {
    await Promise.all([
      leavePassword,
      pwField.press('Enter', { timeout: 15_000, noWaitAfter: true }),
    ]);
  }
  logger.action('storefront: unlocked');
}

/**
 * Dismiss the OneTrust / cookie-consent banner if visible.
 * Tries multiple selectors so it survives theme upgrades.
 *
 * @param {import('playwright').Page} page
 */
async function dismissCookieBanner(page) {
  const candidates = [
    '#onetrust-accept-btn-handler',
    'button:has-text("ACCEPT ALL")',
    'button:has-text("Accept all")',
    'button:has-text("Accept All Cookies")',
    '#onetrust-close-btn-container button',
    '.onetrust-close-btn-handler',
    // OneTrust “preference center” / dark overlay can sit above the header and block hovers.
    '#close-pc-btn-handler',
    '.ot-pc-refuse-all-handler',
    'button:has-text("Reject All")',
    'button:has-text("Reject all")',
    '#accept-recommended-btn-handler',
  ];

  for (let round = 0; round < 3; round += 1) {
    let clicked = false;
    for (const selector of candidates) {
      const btn = page.locator(selector).first();
      try {
        if (await btn.isVisible({ timeout: 600 })) {
          await btn.click({ timeout: 3000, force: true });
          logger.action(`storefront: dismissed cookie/consent UI via "${selector}"`);
          await page.waitForTimeout(350);
          clicked = true;
        }
      } catch {
        // try next selector
      }
    }
    try {
      await page.keyboard.press('Escape');
    } catch {
      /* ignore */
    }
    await page.waitForTimeout(200);

    const blocker = page.locator('.onetrust-pc-dark-filter, #onetrust-consent-sdk').first();
    const still = await blocker.isVisible({ timeout: 400 }).catch(() => false);
    if (!still && !clicked) {
      break;
    }
    if (!still) {
      break;
    }
  }

  await page
    .locator('.onetrust-pc-dark-filter')
    .waitFor({ state: 'hidden', timeout: 5000 })
    .catch(() => {});
}

/**
 * Open the storefront with both gates handled.
 *
 * @param {import('playwright').Page} page
 * @param {string} [path='/']
 */
async function openStorefront(page, path = '/') {
  const target = `${env.BASE_URL}${path}`;
  await page.goto(target, {
    waitUntil: 'domcontentloaded',
    timeout: env.NAVIGATION_TIMEOUT,
  });
  await waitForCloudflareChallenge(page);
  await unlockStorefront(page);
  await dismissCookieBanner(page);
}

module.exports = {
  unlockStorefront,
  dismissCookieBanner,
  openStorefront,
  waitForCloudflareChallenge,
};
