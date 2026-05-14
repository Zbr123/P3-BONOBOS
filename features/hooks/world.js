/**
 * Custom Cucumber World.
 *
 * Each scenario gets a fresh `CustomWorld` instance. The World is the
 * single object passed as `this` into every step definition, so we
 * attach:
 *   - the Playwright `browser`, `context`, `page`
 *   - lazy page-object accessors (so steps stay clean)
 *   - per-scenario state bag (`this.state`)
 *
 * Browser lifecycle is owned by `hooks.js`; the World is just a holder.
 */

const { setWorldConstructor, World } = require('@cucumber/cucumber');

const helpers = require('../../helpers');
const pages = require('../../pages');

class CustomWorld extends World {
  constructor(options) {
    super(options);

    /** @type {import('playwright').Browser|null} */
    this.browser = null;
    /** @type {import('playwright').BrowserContext|null} */
    this.context = null;
    /** @type {import('playwright').Page|null} */
    this.page = null;

    this.helpers = helpers;
    this.logger = helpers.logger;

    /** Per-scenario shared state — feel free to extend in steps. */
    this.state = {};

    /** Cached page-object instances. */
    this._pages = {};
  }

  /**
   * Lazily instantiate (and cache) a page object for this scenario.
   * Usage in steps:
   *   const login = this.getPage('LoginPage');
   *
   * @param {keyof typeof pages} name
   */
  getPage(name) {
    if (!this.page) {
      throw new Error(
        'World.page is not initialized. Did the Before hook run successfully?'
      );
    }
    const PageClass = pages[name];
    if (!PageClass) {
      throw new Error(`Unknown page object: "${name}"`);
    }
    if (!this._pages[name]) {
      this._pages[name] = new PageClass(this.page);
    }
    return this._pages[name];
  }

  /**
   * Reset cached page objects (call when `page` is replaced, e.g. on new tab).
   */
  resetPageCache() {
    this._pages = {};
  }

  /**
   * Attach a binary file (e.g. screenshot) to the Cucumber/Allure report.
   * Wrapper around `this.attach` that swallows attach failures so a
   * broken reporter never breaks a test.
   * @param {Buffer|string} data
   * @param {string} mediaType
   */
  async safeAttach(data, mediaType) {
    try {
      await this.attach(data, mediaType);
    } catch (error) {
      this.logger.warn(`[world] attach failed: ${error.message}`);
    }
  }
}

setWorldConstructor(CustomWorld);

module.exports = CustomWorld;
