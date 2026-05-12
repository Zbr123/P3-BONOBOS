/**
 * Centralized wait helpers.
 *
 * Wrap Playwright's waiting primitives so that:
 *   - timeouts are sourced from `config/env`
 *   - logs are emitted consistently
 *   - retries are easy to apply
 */

const logger = require('./logger');
const env = require('../config/env');
const { sleep, retry } = require('./utils');

/**
 * Wait for an element to be visible.
 * @param {import('playwright').Locator} locator
 * @param {number} [timeout]
 */
async function forVisible(locator, timeout = env.DEFAULT_TIMEOUT) {
  await locator.waitFor({ state: 'visible', timeout });
}

/**
 * Wait for an element to be hidden / detached.
 * @param {import('playwright').Locator} locator
 * @param {number} [timeout]
 */
async function forHidden(locator, timeout = env.DEFAULT_TIMEOUT) {
  await locator.waitFor({ state: 'hidden', timeout });
}

/**
 * Wait for a URL (string, RegExp or predicate) on the current page.
 * @param {import('playwright').Page} page
 * @param {string|RegExp|((url: string) => boolean)} url
 * @param {number} [timeout]
 */
async function forURL(page, url, timeout = env.NAVIGATION_TIMEOUT) {
  await page.waitForURL(url, { timeout });
}

/**
 * Wait for the network to be idle (no requests for 500ms).
 * @param {import('playwright').Page} page
 * @param {number} [timeout]
 */
async function forNetworkIdle(page, timeout = env.NAVIGATION_TIMEOUT) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for the DOM content to be loaded.
 * @param {import('playwright').Page} page
 * @param {number} [timeout]
 */
async function forDomReady(page, timeout = env.NAVIGATION_TIMEOUT) {
  await page.waitForLoadState('domcontentloaded', { timeout });
}

/**
 * Generic predicate wait — polls `predicate` until it returns truthy.
 * @template T
 * @param {() => Promise<T>|T} predicate
 * @param {object} [opts]
 * @param {number} [opts.timeout]
 * @param {number} [opts.interval]
 * @param {string} [opts.label]
 * @returns {Promise<T>}
 */
async function forCondition(predicate, opts = {}) {
  const timeout = opts.timeout ?? env.DEFAULT_TIMEOUT;
  const interval = opts.interval ?? 250;
  const label = opts.label || 'condition';
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const result = await predicate();
      if (result) return result;
    } catch (error) {
      logger.debug(`[wait:${label}] predicate threw: ${error.message}`);
    }
    await sleep(interval);
  }

  throw new Error(`Timed out (${timeout}ms) waiting for ${label}`);
}

module.exports = {
  forVisible,
  forHidden,
  forURL,
  forNetworkIdle,
  forDomReady,
  forCondition,
  retry,
  sleep,
};
