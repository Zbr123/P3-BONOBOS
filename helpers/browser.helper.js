/**
 * Browser/session manager.
 *
 * High-level helpers around Playwright Browser/BrowserContext/Page that
 * are reused by hooks and (occasionally) by tests when they need a
 * second context for multi-user scenarios.
 */

const path = require('path');
const fs = require('fs-extra');

const env = require('../config/env');
const { launchBrowser, createContext, stopTracing } = require('../config/browser');
const { PATHS } = require('../config/constants');
const logger = require('./logger');

/**
 * Start a fresh session: browser + context + page.
 * @returns {Promise<{
 *   browser: import('playwright').Browser,
 *   context: import('playwright').BrowserContext,
 *   page: import('playwright').Page
 * }>}
 */
async function startSession() {
  const browser = await launchBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();
  // Do not override context `viewport: null` (headed full-window); that would
  // re-apply a fixed emulator size and break visible / maximized runs.
  const fixedViewport = env.HEADLESS || !env.FULL_WINDOW;
  if (fixedViewport) {
    await page.setViewportSize({
      width: env.VIEWPORT_WIDTH,
      height: env.VIEWPORT_HEIGHT,
    });
  }
  logger.debug('[browser] session started');
  return { browser, context, page };
}

/**
 * Tear down a session: stop tracing (if any), close context & browser.
 * Storage state is only persisted when `scenarioPassed === true` — saving
 * cookies from a half-completed flow can poison the next scenario (e.g.
 * a Shopify locale splash that hides the password card).
 *
 * @param {object} session
 * @param {string} [scenarioName]
 * @param {{ scenarioPassed?: boolean }} [opts]
 * @returns {Promise<{tracePath: string|null}>}
 */
async function stopSession(session, scenarioName = 'scenario', opts = {}) {
  const { scenarioPassed = false } = opts;
  let tracePath = null;
  try {
    if (session?.context) {
      tracePath = await stopTracing(session.context, scenarioName);
      if (scenarioPassed) {
        await persistStorageState(session.context);
      }
      await session.context.close();
    }
  } catch (error) {
    logger.warn(`[browser] context close failed: ${error.message}`);
  }

  try {
    if (session?.browser) await session.browser.close();
  } catch (error) {
    logger.warn(`[browser] browser close failed: ${error.message}`);
  }

  logger.debug('[browser] session stopped');
  return { tracePath };
}

/**
 * Take a screenshot from the supplied page and persist it.
 * @param {import('playwright').Page} page
 * @param {string} label
 * @returns {Promise<string>} absolute path to the screenshot
 */
/**
 * Save the context's storage state (cookies + localStorage) so the next
 * scenario / run can reuse Cloudflare's `cf_clearance` cookie and skip the
 * challenge entirely. No-op when `PERSIST_STATE=false`.
 *
 * @param {import('playwright').BrowserContext} context
 */
async function persistStorageState(context) {
  if (!env.PERSIST_STATE || !env.STATE_FILE) return;
  try {
    fs.ensureDirSync(path.dirname(env.STATE_FILE));
    await context.storageState({ path: env.STATE_FILE });
    logger.debug(`[browser] storage state saved -> ${env.STATE_FILE}`);
  } catch (error) {
    logger.warn(`[browser] storage state save failed: ${error.message}`);
  }
}

async function takeScreenshot(page, label) {
  fs.ensureDirSync(PATHS.SCREENSHOTS);
  const safe = String(label || 'screenshot').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filePath = path.join(PATHS.SCREENSHOTS, `${safe}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  logger.info(`[browser] screenshot saved -> ${filePath}`);
  return filePath;
}

module.exports = {
  startSession,
  stopSession,
  takeScreenshot,
  persistStorageState,
};
