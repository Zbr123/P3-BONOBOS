/**
 * Product detail page — PDP_001..PDP_004 (high-variant shirts).
 *
 * Opening a PDP is already a solved problem in this suite: `CartPage`
 * uses `gotoHomeRoot()` + `openFirstProductPdpFromHome()` everywhere
 * cart scenarios need to land on a real merchandised PDP. PdpPage just
 * delegates to the same flow so we don't reinvent the wheel and never
 * need a case-specific env knob — the storefront's own homepage merch
 * decides which PDP we exercise.
 *
 * Once we're on the PDP, the helpers below stay PDP-specific: gallery
 * fingerprint, color-swatch click, variant-group walker, ADD TO BAG
 * readiness.
 */

const BasePage = require('./base.page');
const CartPage = require('./cart.page');
const { dismissCookieBanner, unlockStorefront } = require('../helpers/storefront.helper');

class PdpPage extends BasePage {
  /** Cart-side helper that already owns the home → first PDP flow. */
  cart() {
    if (!this._cart) this._cart = new CartPage(this.page);
    return this._cart;
  }

  async prepareStorefront() {
    await dismissCookieBanner(this.page).catch(() => {});
    await unlockStorefront(this.page);
    await dismissCookieBanner(this.page).catch(() => {});
  }

  async waitForPdpShell(timeout = 45_000) {
    await this.page
      .locator('#MainContent, main[id*="MainContent"], [id*="ProductInformation"], product-form')
      .first()
      .waitFor({ state: 'visible', timeout });
    await this.page
      .locator('h1')
      .first()
      .waitFor({ state: 'visible', timeout: Math.min(timeout, 25_000) })
      .catch(() => {});
  }

  /**
   * PDP_001 / PDP_002 / PDP_003 — reuse the cart suite's already-automated
   * "open first product in collection" flow. The feature explicitly asks for
   * a shirt PDP, so we walk a handful of storefront-level shirt collection
   * paths (the same kind of generic category strings the cart suite uses
   * for /collections/sale etc.). Final fallback is the cart's standard
   * homepage-first-product flow.
   */
  async gotoHighVariantShirtPdp() {
    await this.prepareStorefront();
    const cart = this.cart();

    const shirtCollections = [
      '/collections/dress-shirts',
      '/collections/shirts',
      '/collections/casual-shirts',
      '/collections/mens-shirts',
    ];
    for (const path of shirtCollections) {
      if (await this.tryOpenFirstCardInCollection(path)) {
        await this.prepareStorefront();
        await this.waitForPdpShell();
        return;
      }
    }

    await cart.gotoHomeRoot();
    await this.prepareStorefront();
    await cart.openFirstProductPdpFromHome();
    await this.prepareStorefront();
    await this.waitForPdpShell();
  }

  /** Open the first visible product card in a collection page. Returns false fast if the page has no cards. */
  async tryOpenFirstCardInCollection(collectionPath) {
    try {
      await this.goto(collectionPath);
      await this.prepareStorefront();
      const card = this.page
        .locator(
          [
            'main a[href*="/products/"]:visible',
            '#MainContent a[href*="/products/"]:visible',
            '.product-card a[href*="/products/"]',
            'li.grid__item a[href*="/products/"]',
            'product-card a[href*="/products/"]',
          ].join(', ')
        )
        .first();
      if (!(await card.isVisible({ timeout: 8000 }).catch(() => false))) return false;
      await card.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      await Promise.all([
        this.page.waitForURL(/\/products\//, { timeout: 25_000 }),
        card.click({ timeout: 15_000, force: true }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /** PDP_004 — same flow; no SKU pinning needed for the discovery path. */
  async gotoEverydayLinenOrConfiguredPdp() {
    await this.gotoHighVariantShirtPdp();
  }

  isOnProductUrl() {
    return /\/products\//i.test(this.page.url());
  }

  /** Main gallery / hero image stable fingerprint (query stripped). */
  async mainGalleryFingerprint() {
    const img = this.page
      .locator('media-gallery img, product-gallery img, .product__media img, [class*="product-gallery"] img')
      .first();
    await img.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
    const src = ((await img.getAttribute('src').catch(() => '')) || '').split('?')[0];
    const alt = ((await img.getAttribute('alt').catch(() => '')) || '').trim();
    return `${src}|${alt}`;
  }

  /** PDP_002 — click a second color swatch if present. */
  async clickSecondAvailableColorSwatch() {
    const sw = this.page.locator(
      [
        '.variant-option__swatch-group button:not([disabled])',
        '.variant-option__swatch-group-grid button:not([disabled])',
        '.swatch-wrapper .swatch:not([disabled])',
        'color-swatch button:not([disabled])',
        '[role="radiogroup"][aria-label*="color" i] button:not([disabled])',
        'fieldset:has(legend:has-text("Color")) input[type="radio"]:not([disabled])',
        'fieldset:has(legend:has-text("Color")) button:not([disabled])',
      ].join(', ')
    );
    const n = await sw.count();
    if (n < 2) {
      throw new Error(`PDP_002: expected at least 2 color swatches on ${this.page.url()}; found ${n}`);
    }
    await sw.nth(1).scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    try {
      await sw.nth(1).click({ timeout: 14_000, force: true });
    } catch {
      await sw.nth(1).evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
      });
    }
    await this.page.waitForTimeout(900);
  }

  /**
   * Count distinct variant UI blocks (fieldsets / radiogroups / labeled picker rows) — PDP_003 heuristic.
   */
  async countVariantDimensionsApprox() {
    const form = this.page.locator('product-form, form[action*="/cart/add"]').first();
    await form.waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
    const fieldsets = await form.locator('fieldset').count();
    const groups = await form.locator('[role="radiogroup"]').count();
    const variantRows = await form.locator('[class*="variant-option"], [data-variant-picker]').count();
    const approx = Math.max(fieldsets, groups, Math.ceil(variantRows / 4));
    return { fieldsets, groups, variantRows, approx };
  }

  /**
   * PDP_003 / PDP_004 — pick one option per variant fieldset / picker block.
   * Walks fieldsets, radiogroups, and Bonobos button-pickers; dedupes so
   * a group surfaced twice in the DOM is only clicked once.
   */
  async selectFirstAvailableOptionPerVariantGroup(maxGroups = 16) {
    const form = this.page.locator('product-form, form[action*="/cart/add"]').first();
    await form.waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
    let clicked = 0;
    const visited = new Set();

    const visitGroup = async (group) => {
      const handle = await group.elementHandle().catch(() => null);
      if (!handle) return false;
      const key = await handle.evaluate((el) => {
        if (!el) return '';
        const id = el.id || '';
        const cls = (el.className && el.className.toString()) || '';
        const lab = el.getAttribute('aria-label') || '';
        return `${el.tagName}:${id}:${cls}:${lab}`;
      });
      if (visited.has(key)) return false;
      visited.add(key);

      const unchecked = group.locator('input[type="radio"]:not(:checked)').first();
      if (await unchecked.isVisible({ timeout: 600 }).catch(() => false)) {
        try {
          await unchecked.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
          await unchecked.evaluate((el) => {
            const id = el.id;
            let lbl = null;
            try {
              lbl = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
            } catch {
              lbl = id ? document.querySelector(`label[for="${id}"]`) : null;
            }
            if (lbl instanceof HTMLElement) lbl.click();
            else el.click();
          });
          await this.page.waitForTimeout(320);
          return true;
        } catch {
          /* fall through */
        }
      }

      const btn = group
        .locator(
          'button[aria-pressed="false"]:not([disabled]), button[aria-selected="false"]:not([disabled]), button:not([aria-pressed="true"]):not([aria-selected="true"]):not([disabled])'
        )
        .first();
      if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
        try {
          await btn.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
          await btn.click({ timeout: 7000, force: true });
          await this.page.waitForTimeout(320);
          return true;
        } catch {
          /* skip */
        }
      }
      return false;
    };

    const groupSelectors = ['fieldset', '[role="radiogroup"]', '[data-variant-picker]', '[class*="variant-option"]'];
    for (const sel of groupSelectors) {
      if (clicked >= maxGroups) break;
      const groups = form.locator(sel);
      const count = await groups.count();
      for (let i = 0; i < count && clicked < maxGroups; i += 1) {
        if (await visitGroup(groups.nth(i))) clicked += 1;
      }
    }

    if (clicked === 0) {
      const idSelect = form.locator('select[name="id"]').first();
      if (await idSelect.isVisible({ timeout: 800 }).catch(() => false)) {
        const opts = await idSelect.locator('option').count();
        if (opts > 1) {
          await idSelect.selectOption({ index: 1 }).catch(() => {});
          await this.page.waitForTimeout(320);
          clicked += 1;
        }
      }
    }

    return clicked;
  }

  async addToBagButtonDisabled() {
    const tid = (process.env.PDP_ADD_TO_BAG_TEST_ID || 'standalone-add-to-cart').trim();
    const btn = this.page.getByTestId(tid).first();
    if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) return null;
    return await btn.isDisabled().catch(() => false);
  }

  /** PDP_003 / PDP_004 — after variant selections, primary buy button should be actionable when theme allows. */
  async waitForAddToBagEnabled(timeout = 45_000) {
    const tid = (process.env.PDP_ADD_TO_BAG_TEST_ID || 'standalone-add-to-cart').trim();
    const btn = this.page.getByTestId(tid).first();
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const dis = await btn.isDisabled().catch(() => true);
        if (!dis) return true;
      }
      await this.page.waitForTimeout(400);
    }
    return false;
  }
}

module.exports = PdpPage;
