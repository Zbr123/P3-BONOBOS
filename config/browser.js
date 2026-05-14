/**
 * Browser configuration & launcher.
 *
 * Single source of truth for how Chromium is launched in this framework.
 * Uses `playwright-extra` so we can transparently apply the stealth
 * plugin (helpful against bot-detection on Shopify storefronts).
 *
 * Exposes:
 *   - launchBrowser()        -> Browser
 *   - createContext(browser) -> BrowserContext (with tracing/video config)
 *   - getLaunchOptions()     -> object (pure, easy to test)
 */

const { chromium: chromiumExtra } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs-extra');

const env = require('./env');
const { PATHS } = require('./constants');

// Apply stealth ONCE at module load. Safe to require multiple times.
chromiumExtra.use(StealthPlugin());

/**
 * Build Playwright launch options from env. Pure function.
 * @returns {import('playwright').LaunchOptions}
 */
function getLaunchOptions() {
  const w = env.VIEWPORT_WIDTH;
  const h = env.VIEWPORT_HEIGHT;
  const useFullWindow = !env.HEADLESS && env.FULL_WINDOW;

  const args = [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-features=IsolateOrigins,site-per-process',
  ];

  if (useFullWindow) {
    // Headed + full window: let the page use the real window size (matches viewport: null).
    args.push('--start-maximized');
  } else {
    args.push(`--window-size=${w},${h}`, '--window-position=0,0');
  }

  /** @type {import('playwright').LaunchOptions} */
  const options = {
    headless: env.HEADLESS === true,
    slowMo: env.SLOW_MO,
    args,
    timeout: env.NAVIGATION_TIMEOUT,
  };

  if (env.CHANNEL) options.channel = env.CHANNEL;

  return options;
}

/**
 * Build context options. Centralizes viewport, recording, downloads, etc.
 * @returns {import('playwright').BrowserContextOptions}
 */
function getContextOptions() {
  if (env.VIDEO) {
    fs.ensureDirSync(PATHS.VIDEOS);
  }
  fs.ensureDirSync(PATHS.DOWNLOADS);

  const useFullWindow = !env.HEADLESS && env.FULL_WINDOW;

  /** @type {import('playwright').BrowserContextOptions} */
  const options = {
    ...(useFullWindow
      ? { viewport: null }
      : {
          viewport: {
            width: env.VIEWPORT_WIDTH,
            height: env.VIEWPORT_HEIGHT,
          },
          screen: {
            width: env.VIEWPORT_WIDTH,
            height: env.VIEWPORT_HEIGHT,
          },
          deviceScaleFactor: 1,
        }),
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // Cloudflare bot heuristics look at these.
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  };

  // Re-use the storage state (incl. cf_clearance cookie) when available so
  // we don't re-trigger Cloudflare's challenge on every scenario.
  if (env.PERSIST_STATE && env.STATE_FILE && fs.existsSync(env.STATE_FILE)) {
    options.storageState = env.STATE_FILE;
  }

  if (env.VIDEO) {
    options.recordVideo = {
      dir: PATHS.VIDEOS,
      size: {
        width: useFullWindow ? 1920 : env.VIEWPORT_WIDTH,
        height: useFullWindow ? 1080 : env.VIEWPORT_HEIGHT,
      },
    };
  }

  return options;
}

/**
 * Launch a Chromium instance via playwright-extra (with stealth applied).
 * @returns {Promise<import('playwright').Browser>}
 */
async function launchBrowser() {
  return chromiumExtra.launch(getLaunchOptions());
}

/**
 * Create a fresh browser context with framework-wide defaults.
 * Tracing is started here (if enabled) and stopped per-scenario in hooks.
 * @param {import('playwright').Browser} browser
 * @returns {Promise<import('playwright').BrowserContext>}
 */
async function createContext(browser) {
  const context = await browser.newContext(getContextOptions());
  context.setDefaultTimeout(env.DEFAULT_TIMEOUT);
  context.setDefaultNavigationTimeout(env.NAVIGATION_TIMEOUT);

  if (env.TRACE) {
    fs.ensureDirSync(PATHS.TRACES);
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
  }

  return context;
}

/**
 * Stop tracing and persist the trace zip for a given context/scenario.
 * Returns the absolute trace path or null when tracing is disabled.
 * @param {import('playwright').BrowserContext} context
 * @param {string} scenarioName
 * @returns {Promise<string|null>}
 */
async function stopTracing(context, scenarioName) {
  if (!env.TRACE) return null;
  fs.ensureDirSync(PATHS.TRACES);
  const safeName = scenarioName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
  const tracePath = path.join(PATHS.TRACES, `${safeName}-${Date.now()}.zip`);
  await context.tracing.stop({ path: tracePath });
  return tracePath;
}

module.exports = {
  chromium: chromiumExtra,
  launchBrowser,
  createContext,
  getLaunchOptions,
  getContextOptions,
  stopTracing,
};
