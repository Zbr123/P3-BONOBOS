/**
 * Common, framework-wide step definitions.
 *
 * This file is the CANONICAL home for the storefront login flow. Any
 * feature in the suite (homepage, PDP, cart, checkout, account, ...)
 * reuses the exact same three steps in its own `Background:` block —
 * keeping the BDD layer DRY and the actual login logic in one place.
 *
 *   Background:
 *     Given user is on the login page
 *     When he enters the password "sifrah"
 *     Then he should see the homepage
 *
 * Other generic helpers (navigate, wait, title/URL assertions) also
 * live here so feature-specific step files stay focused on business
 * logic.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const fs = require('fs');

const env = require('../../config/env');
const { persistStorageState } = require('../../helpers/browser.helper');
const {
  unlockStorefront,
  dismissCookieBanner,
  waitForCloudflareChallenge,
} = require('../../helpers/storefront.helper');

// ---------- Generic navigation ----------

Given('I navigate to {string}', async function (urlOrPath) {
  const target = /^https?:\/\//i.test(urlOrPath)
    ? urlOrPath
    : `${env.BASE_URL}${urlOrPath}`;
  await this.page.goto(target, {
    waitUntil: 'domcontentloaded',
    timeout: env.NAVIGATION_TIMEOUT,
  });
});

When('I wait for {int} ms', async function (ms) {
  await this.page.waitForTimeout(ms);
});

Then('the page title should contain {string}', async function (fragment) {
  const title = await this.page.title();
  expect(title.toLowerCase()).toContain(fragment.toLowerCase());
});

Then('the URL should contain {string}', async function (fragment) {
  await expect(this.page).toHaveURL(
    new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  );
});

// ---------- Shopify storefront password gate ----------

/**
 * Step 1 — Open the storefront **password** page first.
 *
 * Navigates straight to `BASE_URL/password` so the browser never flashes
 * the public homepage before the gate. If a stale session still skips
 * the gate, storefront cookies are cleared (Cloudflare cookies kept) and
 * `/password` is opened again.
 */
Given('user is on the login page', async function () {
  const root = env.BASE_URL.replace(/\/$/, '');

  // `storageState` (PERSIST_STATE) restores Shopify cookies + localStorage.
  // That often leaves /password looking wrong in automation: same URL as
  // manual, but the password card stays hidden. Strip storefront cookies and
  // keep only Cloudflare cookies, then open a clean gate.
  const existing = await this.context.cookies();
  const keepCf = existing.filter((c) => /cf_clearance|__cf_bm/i.test(c.name));
  await this.context.clearCookies();
  if (keepCf.length) await this.context.addCookies(keepCf);

  const hadPersistedFile =
    Boolean(env.PERSIST_STATE && env.STATE_FILE && fs.existsSync(env.STATE_FILE));

  const gotoPassword = async () => {
    await this.page.goto(`${root}/password`, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await waitForCloudflareChallenge(this.page);
    await dismissCookieBanner(this.page);
  };

  await gotoPassword();

  if (!this.page.url().includes('/password')) {
    const cookies = await this.context.cookies();
    const keep = cookies.filter((c) => /cf_clearance|__cf_bm/i.test(c.name));
    await this.context.clearCookies();
    if (keep.length) await this.context.addCookies(keep);
    await gotoPassword();
  }

  await expect(this.page).toHaveURL(/\/password/, { timeout: 20_000 });

  // After a saved session file, wipe origin storage and reload once so the
  // DOM matches what you see opening /password manually in a fresh browser.
  if (hadPersistedFile) {
    await this.page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await this.page.reload({
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await waitForCloudflareChallenge(this.page);
    await dismissCookieBanner(this.page);
    await expect(this.page).toHaveURL(/\/password/, { timeout: 20_000 });
  }

  // Shopify password template uses id="Password" — prefer it over a generic type selector.
  const pwField = this.page.locator('#Password, input[type="password"]').first();
  await pwField.waitFor({ state: 'attached', timeout: 15_000 });
  await pwField.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});

  try {
    await expect(pwField).toBeVisible({ timeout: 10_000 });
  } catch {
    // One last attempt: dismiss every overlay we know about, force-show the
    // password card if Shopify hid it via inline style, then re-check.
    this.logger.warn(
      'storefront: password input hidden — dismissing overlays and forcing visibility'
    );
    await dismissCookieBanner(this.page);
    await this.page.evaluate(() => {
      const ids = [
        'shopify-section-password-header',
        'shopify-section-password-main',
        'shopify-section-password-footer',
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.removeAttribute('hidden');
        }
      });
      const input = document.querySelector('#Password, input[type="password"]');
      if (input) {
        let n = input;
        while (n && n !== document.body) {
          n.style.visibility = 'visible';
          n.style.opacity = '1';
          n.removeAttribute('hidden');
          n = n.parentElement;
        }
      }
    }).catch(() => {});
    try {
      await expect(pwField).toBeVisible({ timeout: 8_000 });
    } catch {
      // Half-painted password gate (animations / stale session) — hard reload
      // on the same URL usually restores a visible field.
      this.logger.warn('storefront: password still hidden — reloading /password once');
      await this.page.reload({
        waitUntil: 'domcontentloaded',
        timeout: env.NAVIGATION_TIMEOUT,
      });
      await waitForCloudflareChallenge(this.page);
      await dismissCookieBanner(this.page);
      await expect(this.page).toHaveURL(/\/password/, { timeout: 15_000 });
      await pwField.waitFor({ state: 'attached', timeout: 15_000 });
      await pwField.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
      await expect(pwField).toBeVisible({ timeout: 15_000 });
    }
  }

  this.logger.step('on storefront login (password) page');
});

/**
 * Step 2 — Enter the storefront password and submit.
 */
When('he enters the password {string}', async function (password) {
  // Stash the password on the world so other steps can refer to it.
  this.state.storePassword = password;

  // Reuse the storefront helper for resilience (handles theme variants).
  // We temporarily inject the supplied password via the helper's env
  // override path: easiest is to mirror the helper's logic here so the
  // BDD step is self-contained and readable.
  const pwField = this.page.locator('#Password, input[type="password"]').first();
  await pwField.waitFor({ state: 'attached', timeout: 15_000 });
  await pwField.fill(password, { force: true });

  const submitBtn = this.page
    .locator(
      'button:has-text("Enter"), button[type="submit"], form[action*="password"] button'
    )
    .first();

  const navTimeout = env.NAVIGATION_TIMEOUT;
  const leavePassword = this.page.waitForURL(
    (u) => !u.toString().includes('/password'),
    { timeout: navTimeout, waitUntil: 'domcontentloaded' }
  );

  // Do not let click() wait for navigation — Bonobos loads many 3P
  // scripts and the default "navigation after click" wait can exceed
  // 5s and flake. We only wait on waitForURL above.
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
  // A second Cloudflare interstitial sometimes appears after the gate.
  await waitForCloudflareChallenge(this.page);
  this.logger.step(`submitted storefront password (length=${password.length})`);
});

/**
 * Step 3 — Confirm we landed on the homepage.
 */
Then('he should see the homepage', { timeout: 120_000 }, async function () {
  // CF may still be in front of us right after the gate submits.
  await waitForCloudflareChallenge(this.page);
  await expect(this.page).toHaveURL(
    new RegExp(`^${env.BASE_URL.replace(/\/+$/, '')}/?(\\?.*)?$`),
    { timeout: 20_000 }
  );

  // Dismiss any post-load overlays (cookie banner, newsletter modal).
  await dismissCookieBanner(this.page);

  // Strong "homepage rendered" signal: header logo visible.
  await expect(
    this.page.locator('a.new-header__logo-link, header a[href="/"]').first()
  ).toBeVisible({ timeout: 20_000 });

  // Guarantee subsequent steps that build a HomePage object see the
  // password gate as fully traversed (used by the helper's idempotent
  // unlock checks).
  await unlockStorefront(this.page);

  const home = this.getPage('HomePage');
  await home.waitForHomepageReady(60_000);

  this.logger.step('homepage is visible');

  // Persist cf_clearance + storefront cookies as soon as the gate is cleared,
  // so the next scenario/run does not depend on the whole scenario passing.
  if (this.context && env.PERSIST_STATE && env.STATE_FILE) {
    try {
      await persistStorageState(this.context);
    } catch (err) {
      this.logger.warn(`storefront: storage state not persisted — ${err.message}`);
    }
  }
});
