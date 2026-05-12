/**
 * One-off recon script.
 *
 * Visits the dev storefront, unlocks the password gate, and prints every
 * link's visible text + href so we can pin down accurate selectors for
 * the home-page test cases (HP_001..HP_006).
 *
 *   node scripts/inspect-homepage.js
 */

require('dotenv/config');
const { launchBrowser, createContext } = require('../config/browser');

const STORE_PASSWORD = process.env.STORE_PASSWORD || 'sifrah';
const BASE_URL =
  process.env.BASE_URL || 'https://bonobos-dev-3.myshopify.com';

(async () => {
  const browser = await launchBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  // 1. Unlock the password gate (form on /password).
  await page.goto(`${BASE_URL}/password`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/password')) {
    const pwField = page.locator('input[type="password"]').first();
    await pwField.waitFor({ state: 'visible', timeout: 15_000 });
    await pwField.fill(STORE_PASSWORD);
    await Promise.all([
      page.waitForURL((url) => !url.toString().includes('/password'), {
        timeout: 30_000,
      }),
      pwField.press('Enter'),
    ]);
  }

  // 2. Let JS settle on the homepage.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // 3. Dump every announcement-bar slide + link.
  const announcement = await page.$$eval(
    '.announcement-bar a, [class*="announcement"] a, header a, .header a',
    (anchors) =>
      anchors.map((a) => ({
        text: (a.textContent || '').trim().replace(/\s+/g, ' '),
        href: a.href,
        ariaLabel: a.getAttribute('aria-label'),
        classes: a.className,
      }))
  );

  // 4. Dump body promotional links.
  const allLinks = await page.$$eval('a', (anchors) =>
    anchors
      .map((a) => ({
        text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        href: a.href,
      }))
      .filter((l) => l.text && l.href && !l.href.startsWith('javascript:'))
  );

  // 5. Find specific test-case targets.
  const interesting = allLinks.filter((l) =>
    /find your fit|find a location|fit quiz|guideshop|25%|30%|sale|discount|promo|chino 2.0/i.test(
      l.text
    )
  );

  console.log('\n=== Header / announcement bar links ===');
  console.log(JSON.stringify(announcement, null, 2));

  console.log('\n=== Test-case-relevant links ===');
  console.log(JSON.stringify(interesting, null, 2));

  console.log(`\nTotal links on page: ${allLinks.length}`);
  console.log(`Final URL: ${page.url()}`);

  await context.close();
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
