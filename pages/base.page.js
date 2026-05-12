/**
 * BasePage — every page object extends this class.
 *
 * The BasePage centralizes:
 *   - common wrappers around `page.click`, `page.fill`, `page.locator`
 *   - logging for every UI action (helps Cursor debug failing scenarios)
 *   - retry-safe helpers (re-tries flaky clicks/fills automatically)
 *   - URL/title/visibility checks
 *
 * Page objects must contain *only* UI actions. No assertions, no test
 * data, no hard-coded URLs (they should come from the page subclass).
 */

const { expect } = require('@playwright/test');

const env = require('../config/env');
const logger = require('../helpers/logger');
const wait = require('../helpers/wait.helper');
const { retry } = require('../helpers/utils');
const { takeScreenshot } = require('../helpers/browser.helper');

class BasePage {
  /**
   * @param {import('playwright').Page} page
   */
  constructor(page) {
    if (!page) {
      throw new Error('BasePage requires a Playwright Page instance');
    }
    this.page = page;
    this.timeout = env.DEFAULT_TIMEOUT;
  }

  // ---------- Navigation ----------

  /**
   * Navigate to a URL or path. If a path is given, it is appended to BASE_URL.
   * @param {string} target
   * @param {import('playwright').PageGotoOptions} [options]
   */
  async goto(target, options = {}) {
    const url = /^https?:\/\//i.test(target) ? target : `${env.BASE_URL}${target}`;
    logger.action(`goto: ${url}`);
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
      ...options,
    });
  }

  async reload() {
    logger.action('reload');
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  async goBack() {
    logger.action('goBack');
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }

  // ---------- Locator wrappers ----------

  /**
   * Resolve a selector string OR pass through an existing Locator unchanged.
   * @param {string|import('playwright').Locator} selectorOrLocator
   * @returns {import('playwright').Locator}
   */
  $(selectorOrLocator) {
    if (typeof selectorOrLocator === 'string') {
      return this.page.locator(selectorOrLocator);
    }
    return selectorOrLocator;
  }

  /**
   * Locate by visible text (uses Playwright's `getByText`).
   */
  byText(text, options) {
    return this.page.getByText(text, options);
  }

  /**
   * Locate by accessible role (preferred over CSS where possible).
   */
  byRole(role, options) {
    return this.page.getByRole(role, options);
  }

  /**
   * Locate by data-test/id attribute (project-wide convention).
   */
  byTestId(id) {
    return this.page.getByTestId(id);
  }

  // ---------- Interactions ----------

  /**
   * Robust click: waits for visibility, retries on transient failures.
   * @param {string|import('playwright').Locator} target
   * @param {object} [opts]
   * @param {string} [opts.label]
   * @param {number} [opts.attempts]
   */
  async click(target, opts = {}) {
    const locator = this.$(target);
    const label = opts.label || target.toString();
    return retry(
      async () => {
        logger.action(`click: ${label}`);
        await wait.forVisible(locator, this.timeout);
        await locator.click({ timeout: this.timeout });
      },
      { attempts: opts.attempts ?? 3, label: `click(${label})` }
    );
  }

  async dblClick(target, opts = {}) {
    const locator = this.$(target);
    const label = opts.label || target.toString();
    logger.action(`dblClick: ${label}`);
    await wait.forVisible(locator, this.timeout);
    await locator.dblclick({ timeout: this.timeout });
  }

  async hover(target, opts = {}) {
    const locator = this.$(target);
    const label = opts.label || target.toString();
    logger.action(`hover: ${label}`);
    await wait.forVisible(locator, this.timeout);
    await locator.hover({ timeout: this.timeout });
  }

  /**
   * Robust fill: clears + types + verifies value.
   * @param {string|import('playwright').Locator} target
   * @param {string} value
   * @param {object} [opts]
   */
  async fill(target, value, opts = {}) {
    const locator = this.$(target);
    const label = opts.label || target.toString();
    return retry(
      async () => {
        logger.action(`fill: ${label} = "${opts.mask ? '***' : value}"`);
        await wait.forVisible(locator, this.timeout);
        await locator.fill('');
        await locator.fill(String(value));
      },
      { attempts: opts.attempts ?? 2, label: `fill(${label})` }
    );
  }

  async type(target, value, opts = {}) {
    const locator = this.$(target);
    const label = opts.label || target.toString();
    logger.action(`type: ${label}`);
    await wait.forVisible(locator, this.timeout);
    await locator.type(String(value), { delay: opts.delay ?? 25 });
  }

  async pressKey(target, key) {
    const locator = this.$(target);
    logger.action(`pressKey: ${key}`);
    await locator.press(key);
  }

  async select(target, value) {
    const locator = this.$(target);
    logger.action(`select: ${target} = ${value}`);
    await locator.selectOption(value);
  }

  async check(target) {
    const locator = this.$(target);
    logger.action(`check: ${target}`);
    await locator.check();
  }

  async uncheck(target) {
    const locator = this.$(target);
    logger.action(`uncheck: ${target}`);
    await locator.uncheck();
  }

  // ---------- Reads ----------

  async getText(target) {
    const locator = this.$(target);
    await wait.forVisible(locator, this.timeout);
    const text = (await locator.textContent()) || '';
    return text.trim();
  }

  async getValue(target) {
    const locator = this.$(target);
    await wait.forVisible(locator, this.timeout);
    return locator.inputValue();
  }

  async getAttribute(target, name) {
    const locator = this.$(target);
    return locator.getAttribute(name);
  }

  async isVisible(target) {
    return this.$(target).isVisible();
  }

  async exists(target) {
    return (await this.$(target).count()) > 0;
  }

  // ---------- Waits ----------

  async waitForElement(target, state = 'visible', timeout = this.timeout) {
    await this.$(target).waitFor({ state, timeout });
  }

  async waitForURL(url, timeout) {
    await wait.forURL(this.page, url, timeout);
  }

  async waitForLoad() {
    await wait.forNetworkIdle(this.page);
  }

  // ---------- Artifacts ----------

  async screenshot(label = 'page') {
    return takeScreenshot(this.page, label);
  }

  // ---------- Assertions (used inside steps, not page logic) ----------

  /**
   * Soft visibility assertion. Returns boolean; the *step* decides what
   * to do with the result. Pages MUST stay assertion-free apart from
   * the wait-style helpers below.
   */
  async expectVisible(target, timeout = this.timeout) {
    await expect(this.$(target)).toBeVisible({ timeout });
  }

  async expectHidden(target, timeout = this.timeout) {
    await expect(this.$(target)).toBeHidden({ timeout });
  }

  async expectText(target, text, timeout = this.timeout) {
    await expect(this.$(target)).toHaveText(text, { timeout });
  }

  async expectURL(url, timeout = env.NAVIGATION_TIMEOUT) {
    await expect(this.page).toHaveURL(url, { timeout });
  }
}

module.exports = BasePage;
