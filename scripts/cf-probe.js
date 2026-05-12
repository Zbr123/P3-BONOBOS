/**
 * Probes the Bonobos DEV storefront to identify what's blocking automation:
 *   - HTTP headers (server, set-cookie names — `cf_*`, `__cf_*`, `_shopify_*`)
 *   - Final URL (was there a redirect/challenge?)
 *   - Page title + a short body excerpt (so we can spot "Just a moment…",
 *     Shopify's bot-wall copy, or the actual storefront password page)
 *
 * Runs through `playwright-extra` with the stealth plugin and the real
 * Chrome channel (matches what our test framework uses).
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

(async () => {
  const targets = [
    'https://bonobos-dev-3.myshopify.com',
    'https://bonobos-dev-3.myshopify.com/password',
  ];

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });

  const page = await ctx.newPage();

  for (const url of targets) {
    console.log('\n=== ' + url + ' ===');
    let response = null;
    try {
      response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
    } catch (e) {
      console.log('navigation error:', e.message);
    }

    const status = response?.status() ?? 'n/a';
    const headers = response ? response.headers() : {};
    const finalUrl = page.url();
    const title = await page.title().catch(() => '');
    const bodyText = (await page.evaluate(() => document.body?.innerText || '').catch(() => '')).slice(
      0,
      400
    );
    const cookies = (await ctx.cookies(url)).map((c) => c.name);

    console.log('status   :', status);
    console.log('finalUrl :', finalUrl);
    console.log('title    :', title);
    console.log('server   :', headers['server']);
    console.log('cf-ray   :', headers['cf-ray'] || '(none)');
    console.log('cf-mit   :', headers['cf-mitigated'] || '(none)');
    console.log('cookies  :', cookies.join(', ') || '(none)');
    console.log('body[0:400]:\n' + bodyText);
  }

  await browser.close();
})().catch((e) => {
  console.error('probe failed:', e);
  process.exit(1);
});
