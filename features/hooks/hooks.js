/**
 * Cucumber hooks — global lifecycle for the framework.
 *
 *   BeforeAll  -> set timeouts, prep artifact directories
 *   Before     -> launch browser+context+page (one per scenario)
 *   AfterStep  -> per-step screenshot on failure (very useful for AI debugging)
 *   After      -> stop tracing, attach artifacts, close session
 *   AfterAll   -> nothing global to tear down (browsers are per-scenario)
 *
 * Browsers are launched per-scenario for isolation. If you need to
 * speed up large suites, switch to a shared `BeforeAll` browser and
 * a fresh context per scenario — the helpers already support both.
 */

const fs = require('fs-extra');
const path = require('path');
const {
  Before,
  After,
  BeforeAll,
  AfterAll,
  AfterStep,
  Status,
  setDefaultTimeout,
} = require('@cucumber/cucumber');

require('./world');

const env = require('../../config/env');
const { PATHS } = require('../../config/constants');
const logger = require('../../helpers/logger');
const browserHelper = require('../../helpers/browser.helper');

setDefaultTimeout(env.NAVIGATION_TIMEOUT);

// ---------- BeforeAll ----------
BeforeAll(async function beforeAllHook() {
  [
    PATHS.REPORTS,
    PATHS.ALLURE_RESULTS,
    PATHS.SCREENSHOTS,
    PATHS.VIDEOS,
    PATHS.TRACES,
    PATHS.LOGS,
    PATHS.DOWNLOADS,
  ].forEach((dir) => fs.ensureDirSync(dir));

  logger.info('==============================================');
  logger.info(`Starting test run @ ${new Date().toISOString()}`);
  logger.info(`BASE_URL = ${env.BASE_URL}`);
  logger.info(`HEADLESS = ${env.HEADLESS} | SLOW_MO = ${env.SLOW_MO}ms`);
  logger.info('==============================================');
});

// ---------- Before (per-scenario) ----------
Before(async function beforeHook(scenario) {
  const name = scenario.pickle?.name || 'scenario';
  this.scenarioName = name;
  this.startedAt = Date.now();
  logger.info(`▶ Scenario: ${name}`);

  const session = await browserHelper.startSession();
  this.browser = session.browser;
  this.context = session.context;
  this.page = session.page;
  this.resetPageCache();

  // Stream browser console errors into the world for diagnostics.
  this.state.consoleErrors = [];
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') this.state.consoleErrors.push(msg.text());
  });

  // The actual password-gate unlock happens lazily inside the page
  // object's `open()` method (via `storefront.openStorefront`) so we
  // don't pay the cost twice or block the hook on Shopify's slow
  // network when something goes wrong.
});

// ---------- AfterStep ----------
AfterStep(async function afterStepHook({ result, pickleStep }) {
  if (!env.SCREENSHOT_ON_FAILURE) return;
  if (result.status !== Status.FAILED) return;
  if (!this.page) return;

  try {
    const buf = await this.page.screenshot({ fullPage: true });
    await this.safeAttach(buf, 'image/png');
    const label = `${this.scenarioName || 'step'}__${pickleStep?.text || 'failed'}`;
    const filePath = path.join(
      PATHS.SCREENSHOTS,
      `${label.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80)}-${Date.now()}.png`
    );
    fs.ensureDirSync(PATHS.SCREENSHOTS);
    fs.writeFileSync(filePath, buf);
    logger.warn(`✗ Step failed — screenshot: ${filePath}`);
  } catch (error) {
    logger.warn(`[afterStep] screenshot failed: ${error.message}`);
  }
});

// ---------- After (per-scenario) ----------
After(async function afterHook(scenario) {
  const status = scenario.result?.status;
  const name = this.scenarioName || scenario.pickle?.name || 'scenario';
  const duration = Date.now() - (this.startedAt || Date.now());

  if (status === Status.FAILED && this.page) {
    try {
      const buf = await this.page.screenshot({ fullPage: true });
      await this.safeAttach(buf, 'image/png');
    } catch (error) {
      logger.warn(`[after] final screenshot failed: ${error.message}`);
    }
  }

  const { tracePath } = await browserHelper.stopSession(
    { browser: this.browser, context: this.context },
    name,
    { scenarioPassed: status === Status.PASSED }
  );

  if (status === Status.FAILED && tracePath) {
    logger.warn(
      `✗ Trace saved -> ${tracePath}  (open with: npx playwright show-trace "${tracePath}")`
    );
  }

  logger.info(`◀ Scenario "${name}" -> ${status} (${duration}ms)`);
  logger.info('----------------------------------------------');

  this.browser = null;
  this.context = null;
  this.page = null;
  this.resetPageCache?.();
});

// ---------- AfterAll ----------
AfterAll(async function afterAllHook() {
  logger.info(`Test run finished @ ${new Date().toISOString()}`);
});
