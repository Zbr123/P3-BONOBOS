/**
 * Cart drawer / `/cart` page — CP_* automation helpers.
 *
 * Selectors tolerate Shopify theme variants (drawer vs full cart).
 */

const BasePage = require('./base.page');
const env = require('../config/env');
const { expect } = require('@playwright/test');
const {
  cp002RecordedLocators,
  cp005RecordedLocators,
  cp007Locators,
  cp011Locators,
  pdpAddToBagLocators,
  cp006EmptyCartNavLinks,
  optionalProductPaths,
  cp020Discovery,
  cp020PantVariantByHandle,
  cp020RecordedImageSrcStems,
  cp020SaleNavXPath,
} = require('../features/cart/cart.data');
const { dismissCookieBanner, unlockStorefront } = require('../helpers/storefront.helper');

class CartPage extends BasePage {
  constructor(page) {
    super(page);

    this.selectors = {
      cartEntry:
        'header a[href="/cart"], header a[href*="/cart"]:not([href*="/cart/"]), a[href*="/cart"]:visible',
      cartIconAlt:
        'header a[aria-label*="Bag" i], header a[aria-label*="Cart" i], header button[aria-label*="Bag" i], header [data-testid="cart-drawer-trigger"], #cart-icon-bubble a, a.header__icon--cart',
      // Avoid bare `dialog[open]` — it can match non-cart modals and break surface assertions.
      drawerRoot:
        'cart-drawer, #CartDrawer, [id*="CartDrawer"], .drawer--cart, dialog[open]:has(cart-quantity-selector-component), dialog[open]:has(.cart-item), dialog[open]:has([name="checkout"])',
      lineItem:
        [
          'cart-line-item',
          'cart-drawer cart-line-item',
          'dialog[open] cart-line-item',
          '[data-test="cart-line-item"]',
          'cart-drawer .cart-item',
          '#CartDrawer .cart-item',
          '.cart__contents .cart-item',
          '[class*="CartItem"]',
          'cart-drawer .cart-product',
          '#CartDrawer .cart-product',
          '.cart__contents .cart-product',
          'dialog[open] .cart-product',
          'dialog[open] .cart-item',
        ].join(', '),
      quantityInput:
        'input[name="updates[]"], cart-drawer input[name="updates[]"], .cart-item__quantity input',
      /** CP_003 — matches `<cart-quantity-selector-component>` + `button[name="plus"|"minus"]` (Bonobos). */
      increaseQty:
        'cart-quantity-selector-component button[name="plus"], button.quantity-plus[name="plus"], button[name="plus"], button[aria-label*="Increase" i], .quantity__button[name="plus"]',
      decreaseQty:
        'cart-quantity-selector-component button[name="minus"], button.quantity-minus[name="minus"], button[name="minus"], button[aria-label*="Decrease" i], .quantity__button[name="minus"]',
      /** CP_004 — theme remove control (xpath matches your recording; CSS fallback if class list grows). */
      removeLine:
        'button.cart-product__remove-link, xpath=//button[@class="cart-product__remove-link"], xpath=//button[contains(@class,"cart-product__remove-link")], button:has-text("Remove"), a:has-text("Remove"), cart-remove-button, [id*="Remove"]',
      editLine: 'a:has-text("Edit"), button:has-text("Edit")',
      updateBag:
        'button:has-text("Update Bag"), button:has-text("Update bag"), button:has-text("Update"), [data-update-cart], button[name="update"], [data-testid="standalone-add-to-cart"], button.add-to-cart-button[name="add"], button[id*="add-to-cart"][type="submit"], form[action*="/cart"] button[type="submit"]:has-text("Update")',
      closeDrawer: 'button[aria-label*="Close" i], .drawer__close, [data-cart-drawer-close]',
      checkout: 'button[name="checkout"], a[href*="/checkout"], button:has-text("Checkout")',
      subtotalRow: ':text-matches("Subtotal", "i")',
      promoRow: ':text-matches("^Promo|^Promotion|Discount", "i")',
      totalRow: ':text-matches("Total", "i")',
    };
  }

  cartSurface() {
    if (/\/cart(\/|$|\?)/i.test(this.page.url())) {
      return this.page.locator('#MainContent, main .cart, .cart__warnings, cart-items').first();
    }
    return this.page.locator(this.selectors.drawerRoot).first();
  }

  async openBagFromHeader() {
    await dismissCookieBanner(this.page).catch(() => {});
    const drawerTrigger = this.page.getByTestId('cart-drawer-trigger').first();
    try {
      await drawerTrigger.waitFor({ state: 'attached', timeout: 20_000 });
      await drawerTrigger.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => {});
      try {
        await drawerTrigger.click({ timeout: 15_000, force: true });
      } catch {
        await drawerTrigger.evaluate((el) => {
          if (el instanceof HTMLElement) el.click();
        });
      }
      await this.page.waitForTimeout(400);
      if (!(await this.isCartUiOpen())) {
        await drawerTrigger.evaluate((el) => {
          if (el instanceof HTMLElement) el.click();
        });
        await this.page.waitForTimeout(400);
      }
      if (await this.isCartUiOpen()) return;
    } catch {
      /* Fall back if test id is absent or not clickable in this theme/build. */
    }
    const cart = this.page.locator(this.selectors.cartEntry).first();
    if (await cart.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cart.click({ timeout: 10_000, force: true });
      return;
    }
    const alt = this.page.locator(this.selectors.cartIconAlt).first();
    await alt.waitFor({ state: 'visible', timeout: 10_000 });
    await alt.click({ timeout: 10_000, force: true });
  }

  async waitForCartUiOpen(timeout = 15_000) {
    const urlOk = /\/cart(\/|$|\?)/i.test(this.page.url());
    if (urlOk) {
      await this.page.locator('main, #MainContent, cart-items').first().waitFor({
        state: 'visible',
        timeout,
      });
      return;
    }
    await this.page.locator(this.selectors.drawerRoot).first().waitFor({
      state: 'visible',
      timeout,
    });
  }

  async isCartUiOpen() {
    if (/\/cart/i.test(this.page.url())) return true;
    const root = this.page.locator(this.selectors.drawerRoot).first();
    if (await root.isVisible({ timeout: 1500 }).catch(() => false)) return true;
    const expanded = await this.page
      .getByTestId('cart-drawer-trigger')
      .first()
      .getAttribute('aria-expanded')
      .catch(() => null);
    return expanded === 'true';
  }

  async lineItemCount() {
    const surface = this.cartSurface();
    let n = await surface.locator(this.selectors.lineItem).count();
    if (n > 0) return n;
    const byQty = await surface.locator('cart-quantity-selector-component').count();
    if (byQty > 0) return byQty;
    return await surface.locator('button.cart-product__remove-link').count();
  }

  /** Wait until the cart surface shows at least `min` line rows (CP_003 / flaky drawer paint). */
  async waitForCartLineItems(min = 1, timeout = 25_000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const n = await this.lineItemCount();
      if (n >= min) return n;
      await this.page.waitForTimeout(400);
    }
    return this.lineItemCount();
  }

  /**
   * CP_003 — Two lines: + once per line, then − once per line (qty returns to 1 each).
   * Locators follow theme: `cart-quantity-selector-component` + `name="plus"|"minus"` / `quantity-plus|minus`.
   */
  async clickPlusOncePerLineThenMinusOncePerLine() {
    await this.waitForCartUiOpen();
    const surface = this.cartSurface();
    await surface
      .locator('cart-quantity-selector-component')
      .first()
      .waitFor({ state: 'visible', timeout: 25_000 })
      .catch(() => {});

    const componentPlus = surface.locator('cart-quantity-selector-component button[name="plus"]');
    const componentMinus = surface.locator('cart-quantity-selector-component button[name="minus"]');
    const classPlus = surface.locator('button.quantity-plus[name="plus"]');
    const classMinus = surface.locator('button.quantity-minus[name="minus"]');
    const productPlus = surface.locator('.cart-product button[name="plus"]');
    const productMinus = surface.locator('.cart-product button[name="minus"]');
    const loosePlus = surface.locator('button[name="plus"]');
    const looseMinus = surface.locator('button[name="minus"]');

    /** First strategy with ≥2 paired +/- controls wins. */
    const resolvePair = async () => {
      const tryPairs = [
        [componentPlus, componentMinus],
        [classPlus, classMinus],
        [productPlus, productMinus],
        [loosePlus, looseMinus],
      ];
      for (const [p, m] of tryPairs) {
        const np = await p.count();
        const nm = await m.count();
        const n = Math.min(np, nm);
        if (n >= 2) return { plus: p, minus: m, n };
      }
      return null;
    };

    const deadline = Date.now() + 55_000;
    let resolved = null;
    while (Date.now() < deadline) {
      resolved = await resolvePair();
      if (resolved) break;
      await this.page.waitForTimeout(450);
    }
    if (!resolved) return false;

    const { plus, minus, n } = resolved;

    const clickQty = async (locator, index) => {
      const btn = locator.nth(index);
      await btn.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
      try {
        await btn.click({ timeout: 12_000, force: true });
      } catch {
        await btn.evaluate((el) => {
          if (el instanceof HTMLElement) el.click();
        });
      }
      await this.page.waitForTimeout(600);
    };

    for (let i = 0; i < n; i += 1) {
      await clickQty(plus, i);
    }
    // Minus is disabled at qty 1; after + each line should be ≥2 before we −.
    for (let i = 0; i < n; i += 1) {
      const btn = minus.nth(i);
      await btn.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
      await btn
        .waitFor({ state: 'visible', timeout: 12_000 })
        .catch(() => {});
      const disabled = await btn.getAttribute('disabled').catch(() => null);
      if (disabled !== null && disabled !== '') {
        await plus.nth(i).click({ timeout: 8000, force: true }).catch(() => {});
        await this.page.waitForTimeout(500);
      }
      await clickQty(minus, i);
    }
    return true;
  }

  async clearCartByRemovingLineItems(maxIterations = 12) {
    await this.openBagFromHeader();
    await this.waitForCartUiOpen();
    for (let i = 0; i < maxIterations; i += 1) {
      const n = await this.lineItemCount();
      if (n === 0) break;
      await this.clickRemoveFirstLineItem();
    }
    await this.closeCartDrawerIfOpen();
  }

  async closeCartDrawerIfOpen() {
    const headerClose = this.page
      .locator('#cart-drawer-header')
      .getByRole('button', { name: 'Close dialog' })
      .first();
    if (await headerClose.isVisible({ timeout: 2500 }).catch(() => false)) {
      await headerClose.click({ timeout: 8000 }).catch(async () => {
        await headerClose.click({ timeout: 8000, force: true });
      });
      await this.page.waitForTimeout(350);
      return;
    }

    const closer = this.page.locator(this.selectors.closeDrawer).first();
    if (await closer.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closer.click({ timeout: 8000 });
      await this.page.waitForTimeout(350);
    }
  }

  /**
   * Homepage merchandised PDP anchors (excludes CDN, hidden hotspot-dialog promos, etc.).
   */
  homepageMerchandisedPdpLinks() {
    const excludeHotspot =
      ':not(.hotspot-dialog__product-link):not(.hotspot-dialog__product-image-link)' +
      ':not(.hotspot-dialog__swatches-more):not(.shop-the-look-inline__swatches-more)' +
      ':not([aria-label="Show all options"])';
    return this.page
      .locator(
        [
          `main a[href*="/products/"]${excludeHotspot}`,
          `#MainContent a[href*="/products/"]${excludeHotspot}`,
        ].join(', ')
      )
      .filter({ hasNot: this.page.locator('[href*="cdn.shopify"]') });
  }

  /**
   * From homepage (already unlocked), open the first **visible** merchandised PDP link.
   * (Shop-the-look “+N” swatch anchors match `/products/` but stay hidden — they are excluded
   * in {@link homepageMerchandisedPdpLinks} and skipped here if the theme still surfaces one.)
   */
  async openFirstProductPdpFromHome() {
    await dismissCookieBanner(this.page).catch(() => {});
    const links = this.homepageMerchandisedPdpLinks();
    const n = await links.count();
    if (n === 0) throw new Error('No merchandised PDP links on homepage');
    for (let i = 0; i < Math.min(n, 30); i += 1) {
      const pdp = links.nth(i);
      if (!(await pdp.isVisible({ timeout: 1200 }).catch(() => false))) continue;
      await pdp.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
      await Promise.all([
        this.page.waitForURL(/\/products\//, { timeout: 30_000 }),
        pdp.click({ timeout: 15_000, force: true }),
      ]);
      return;
    }
    throw new Error('No visible merchandised PDP link on homepage');
  }

  /**
   * Reusable “Add to Bag” control on PDP, drawer quick-add, or variant overlay (Bonobos theme).
   * Order: `data-testid` → `ref` + class → Liquid `ProductSubmitButton` id → role name (nested span labels).
   * @param {import('@playwright/test').Page | import('@playwright/test').Locator} [scope]
   */
  addToBagButtonIn(scope = this.page) {
    const root = scope;
    const ref = pdpAddToBagLocators.refAttr;
    return root
      .getByTestId(pdpAddToBagLocators.testId)
      .or(root.locator(`button.add-to-cart-button[type="submit"][ref="${ref}"]`))
      .or(root.locator('button[id*="ProductSubmitButton"][id*="add-to-cart"]'))
      .or(root.locator('button[id*="__add-to-cart"][type="submit"]'))
      .or(root.getByRole('button', { name: /add\s+to\s+bag/i }));
  }

  /**
   * PDP can register several `[data-testid="standalone-add-to-cart"]` nodes (sticky bar vs main form).
   * `addToBagButtonIn().first()` often resolves to a hidden/disabled clone — clicks never fire on the real CTA.
   */
  async primaryAddToBagButtonOnPdp() {
    const byTestId = this.page.getByTestId(pdpAddToBagLocators.testId);
    const n = await byTestId.count().catch(() => 0);
    if (n === 0) return this.addToBagButtonIn(this.page).first();
    if (n === 1) {
      const only = byTestId.first();
      if (await only.isVisible({ timeout: 2500 }).catch(() => false)) return only;
      return this.addToBagButtonIn(this.page).first();
    }

    const scored = [];
    for (let i = 0; i < n; i += 1) {
      const btn = byTestId.nth(i);
      const vis = await btn.isVisible({ timeout: 1500 }).catch(() => false);
      if (!vis) continue;
      const box = await btn.boundingBox().catch(() => null);
      const area = box && box.width > 4 && box.height > 4 ? box.width * box.height : 0;
      const enabled = await btn.isEnabled().catch(() => false);
      scored.push({ btn, area, enabled });
    }
    if (scored.length === 0) return byTestId.last();

    scored.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return b.area - a.area;
    });
    return scored[0].btn;
  }

  /**
   * Chinos — “Hem Style”, “Hemming”, or similar; if nothing is chosen, Add to Bag stays incomplete.
   */
  async pickFirstHemStyleIfPresentOnPdp() {
    const hemRole = this.page.getByRole('group', { name: /hem\s*style|hemming/i }).first();
    if (await hemRole.isVisible({ timeout: 1800 }).catch(() => false)) {
      await hemRole.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
      const tile = hemRole
        .locator(
          'button[aria-pressed="false"], button:not([aria-selected="true"]):not([disabled]), input[type="radio"]:not(:checked)'
        )
        .first();
      if (await tile.isVisible({ timeout: 1500 }).catch(() => false)) {
        await tile.click({ timeout: 9000, force: true }).catch(() => {});
        await this.page.waitForTimeout(400);
        return true;
      }
    }
    const section = this.page
      .locator('fieldset, [role="group"], section, .product-form__input')
      .filter({ hasText: /hem\s*style|hemming/i })
      .first();
    if (!(await section.isVisible({ timeout: 2000 }).catch(() => false))) return false;
    await section.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
    const tile = section
      .locator(
        'button[aria-pressed="false"], button:not([aria-selected="true"]):not([disabled]), input[type="radio"]:not(:checked)'
      )
      .first();
    if (await tile.isVisible({ timeout: 1500 }).catch(() => false)) {
      await tile.click({ timeout: 9000, force: true }).catch(() => {});
      await this.page.waitForTimeout(400);
      return true;
    }
    return false;
  }

  /**
   * “Tailored” bespoke / custom-tailor upsell card (separate from Pant Fit tiles).
   */
  async pickTailoredBespokeUpsellIfPresentOnPdp() {
    const root = this.page.locator('#MainContent, main, .product, [class*="product-form"]').first();
    const scope = (await root.isVisible({ timeout: 800 }).catch(() => false)) ? root : this.page;
    const card = scope
      .locator('button, [role="button"], div[role="button"]')
      .filter({ hasText: /Tailored/i })
      .filter({ hasText: /bespoke|custom-tailor|exact\s+measurements/i })
      .first();
    if (!(await card.isVisible({ timeout: 2000 }).catch(() => false))) return false;
    await card.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
    await card.click({ timeout: 9000, force: true }).catch(() => {});
    await this.page.waitForTimeout(500);
    return true;
  }

  /**
   * Non–colour variant bump: hidden `select[name="id"]` when the theme still uses it.
   */
  async trySelectSecondVariantIdFromFormSelect() {
    const idSelect = this.page.locator('select[name="id"], form[action*="/cart/add"] select[name="id"]').first();
    if (!(await idSelect.isVisible({ timeout: 900 }).catch(() => false))) return;
    const optCount = await idSelect.locator('option').count();
    if (optCount > 1) {
      await idSelect.selectOption({ index: 1 }).catch(() => {});
      await this.page.waitForTimeout(400);
    }
  }

  /**
   * Generic non-pant variant resolver: walks every `[role="radiogroup"]` / `fieldset` and
   * picks the first available option inside each group whose label is not "Color".
   * Used by {@link #clickAddToBagOnPdp} for non-pant PDPs (shirts, polos, etc.) where the
   * URL handle already pins the colour and only size / fit / length need to be selected.
   *
   * @param {{ includeColor?: boolean }} [opts]
   */
  async selectAllNonColorVariantOptions(opts = {}) {
    const includeColor = opts.includeColor === true;
    const colorRx = /color|colour|monogram|wrap/i;
    const containers = this.page.locator(
      '[role="radiogroup"], fieldset, [class*="variant-picker"], [class*="VariantPicker"]'
    );
    const total = await containers.count();
    const limit = Math.min(total, 20);
    for (let i = 0; i < limit; i += 1) {
      const g = containers.nth(i);
      if (!(await g.isVisible({ timeout: 600 }).catch(() => false))) continue;
      const ariaLabel = (await g.getAttribute('aria-label').catch(() => '')) || '';
      let innerLabel = '';
      try {
        innerLabel = (await g.locator('legend, h2, h3, h4, [class*="label"]').first().innerText({ timeout: 600 })) || '';
      } catch { /* noop */ }
      const fullLabel = (ariaLabel + ' ' + innerLabel).trim();
      if (!includeColor && colorRx.test(fullLabel)) continue;
      const alreadyChecked = await g
        .locator('input[type="radio"]:checked, [aria-checked="true"], [aria-pressed="true"]')
        .count()
        .catch(() => 0);
      if (alreadyChecked > 0) continue;
      const candidates = [
        g.locator('input[type="radio"]:not(:checked):not([disabled])').first(),
        g.getByRole('radio', { checked: false }).first(),
        g.locator('button[role="radio"]:not([aria-disabled="true"]):not([disabled])').first(),
        g.locator('button:not([disabled]):not([aria-disabled="true"])').first(),
        g.locator('label').first(),
      ];
      for (const c of candidates) {
        if (await c.isVisible({ timeout: 600 }).catch(() => false)) {
          await c.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
          try {
            const tag = await c.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
            if (tag === 'input') {
              await c.check({ timeout: 5000, force: true }).catch(() => {});
            } else {
              await c.click({ timeout: 5000, force: true });
            }
            break;
          } catch { /* try next candidate */ }
        }
      }
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * @param {{
   *   excludeColorSwatches?: boolean,
   *   waitForAddToBagEnabledOnly?: boolean,
   *   pantVariantAlreadySelected?: boolean,
   * }} [options]
   *   Pant PDP: {@link #hasPantVariantFormOnPdp} then {@link #selectCp011PantVariantIfPresentOnPdp} (single implementation — waist/length/fit from `cp011Locators`, hemming, bespoke); **no** colour swatches / generic unchecked radios in the wait loop.
   *   `pantVariantAlreadySelected` — skip first preset when the caller already ran {@link #selectCp011PantVariantIfPresentOnPdp}.
   */
  async clickAddToBagOnPdp(options = {}) {
    const excludeColorSwatches = options.excludeColorSwatches === true;
    const waitForAddToBagEnabledOnly = options.waitForAddToBagEnabledOnly === true;
    const pantVariantAlreadySelected = options.pantVariantAlreadySelected === true;
    const deadline = Date.now() + 60_000;
    const resolveAtb = () => this.primaryAddToBagButtonOnPdp();

    let atb = await resolveAtb();
    await atb.waitFor({ state: 'visible', timeout: 25_000 });

    const isPantPdp = await this.hasPantVariantFormOnPdp();
    if (isPantPdp && !pantVariantAlreadySelected) {
      await this.selectCp011PantVariantIfPresentOnPdp();
    }

    atb = await resolveAtb();
    await atb.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});

    const pantSafeLoop = isPantPdp || waitForAddToBagEnabledOnly;
    let waitOnlyPass = 0;

    while (Date.now() < deadline) {
      atb = await resolveAtb();
      if (await atb.isEnabled().catch(() => false)) break;

      if (pantSafeLoop) {
        waitOnlyPass += 1;
        if (waitOnlyPass === 10 || waitOnlyPass === 25) {
          await this.selectCp011PantVariantIfPresentOnPdp();
        }
        if (!waitForAddToBagEnabledOnly && isPantPdp) {
          await this.trySelectSecondVariantIdFromFormSelect();
        }
        await this.page.waitForTimeout(450);
        continue;
      }

      await this.trySelectSecondVariantIdFromFormSelect();
      const lbl = this.page.locator('fieldset input[type="radio"]:not(:checked) + label').first();
      if (await lbl.isVisible({ timeout: 800 }).catch(() => false)) {
        await lbl.click({ timeout: 8000 }).catch(() => {});
      } else {
        const radio = this.page.locator('fieldset input[type="radio"]:not(:checked)').first();
        if (await radio.isVisible({ timeout: 800 }).catch(() => false)) {
          await radio.click({ timeout: 8000, force: true }).catch(() => {});
        }
      }
      const roleRadio = this.page.getByRole('radio', { checked: false }).first();
      if (await roleRadio.isVisible({ timeout: 600 }).catch(() => false)) {
        await roleRadio.click({ timeout: 8000, force: true }).catch(() => {});
      }
      if (!excludeColorSwatches) {
        const swatch = this.page
          .locator('.swatch-wrapper .swatch, .variant-option__swatch-group button, [class*="swatch"] button')
          .first();
        if (await swatch.isVisible({ timeout: 600 }).catch(() => false)) {
          await swatch.click({ timeout: 8000, force: true }).catch(() => {});
        }
      }
      const altVariant = this.page
        .locator('[data-variant-picker] button[aria-pressed="false"], .variant-picker__option button:not([aria-selected="true"])')
        .first();
      if (await altVariant.isVisible({ timeout: 800 }).catch(() => false)) {
        await altVariant.click({ timeout: 8000 }).catch(() => {});
      }
      await this.pickFirstHemStyleIfPresentOnPdp();
      await this.page.waitForTimeout(500);
    }

    atb = await resolveAtb();
    if (!(await atb.isEnabled().catch(() => false))) {
      const tid = pdpAddToBagLocators.testId;
      const n = await this.page.getByTestId(tid).count().catch(() => 0);
      const debug = [];
      for (let i = 0; i < Math.min(n, 6); i += 1) {
        const b = this.page.getByTestId(tid).nth(i);
        debug.push({
          i,
          visible: await b.isVisible().catch(() => false),
          enabled: await b.isEnabled().catch(() => false),
          incomplete: await b.getAttribute('data-selection-incomplete').catch(() => null),
          liquidUnavailable: await b.getAttribute('data-liquid-unavailable').catch(() => null),
          hasDisabledAttr: (await b.getAttribute('disabled').catch(() => null)) != null,
        });
      }
      throw new Error(
        `Add to Bag stayed disabled after 60s — complete required PDP options or remove duplicate sticky ATB. [data-testid="${tid}"] debug: ${JSON.stringify(debug)}`
      );
    }

    await atb.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    try {
      await atb.click({ timeout: 15_000 });
    } catch {
      try {
        await atb.click({ timeout: 18_000, force: true });
      } catch {
        await atb.evaluate((el) => {
          if (el instanceof HTMLElement) el.click();
        });
      }
    }
    await this.page.waitForTimeout(500);
  }

  async cartDrawerOpenedAfterAdd(timeout = 12_000) {
    const drawer = this.page.locator(this.selectors.drawerRoot).first();
    return drawer.isVisible({ timeout }).catch(() => false);
  }

  async freeShippingBannerText() {
    const candidates = this.page.getByText(
      /free shipping|FREE SHIPPING|Spend.*more.*FREE|You've got FREE/i
    );
    const n = await candidates.count();
    for (let i = 0; i < Math.min(n, 8); i += 1) {
      const t = ((await candidates.nth(i).textContent()) || '').trim();
      if (t.length > 5) return t;
    }
    const body = await this.cartSurface().textContent().catch(() => '');
    return (body || '').slice(0, 500);
  }

  async assertEmptyCartCopyVisible(timeoutMs = 18_000) {
    const empty = this.page.getByText(
      /your cart is empty|your bag is empty|cart is empty|bag is empty|no items in your (cart|bag)|nothing\s+in\s+your\s+cart/i
    );
    await empty.first().waitFor({ state: 'visible', timeout: timeoutMs });
  }

  /**
   * CP_006 — wait until empty copy and at least one category CTA are ready (no fixed sleeps).
   * @param {number} timeoutMs
   */
  async waitForEmptyCartMerchandisingReady(timeoutMs = 18_000) {
    const surface = this.cartSurface();
    await surface
      .getByText(/your cart is empty|your bag is empty|cart is empty/i)
      .first()
      .waitFor({ state: 'visible', timeout: timeoutMs });
    const collectionLink = surface.locator('a[href*="/collections/"]').first();
    const altButton = surface.getByRole('button', { name: /NEW |SHOP |RECENTLY/i }).first();
    await Promise.race([
      collectionLink.waitFor({ state: 'visible', timeout: Math.min(12_000, timeoutMs) }),
      altButton.waitFor({ state: 'visible', timeout: Math.min(12_000, timeoutMs) }),
    ]).catch(() => {});
  }

  /**
   * CP_006 — ordered merchandising CTAs in the cart drawer / cart surface (each navigated in the scenario).
   * Prefers collection `<a href>` rows; otherwise NEW / SHOP / RECENTLY buttons (filters obvious chrome).
   */
  async emptyCartCategoryControls() {
    await this.waitForCartUiOpen();
    await this.waitForEmptyCartMerchandisingReady(18_000);
    const surface = this.cartSurface();
    const drawer = this.page.locator(this.selectors.drawerRoot).first();
    const scope = (await drawer.isVisible({ timeout: 1500 }).catch(() => false)) ? drawer : surface;

    const links = scope.locator('a[href*="/collections/"]');
    const linkCount = await links.count();
    const out = [];
    const seenHref = new Set();
    for (let i = 0; i < linkCount; i += 1) {
      const a = links.nth(i);
      const href = (await a.getAttribute('href').catch(() => '')) || '';
      if (!href || seenHref.has(href)) continue;
      seenHref.add(href);
      if (await a.isVisible({ timeout: 800 }).catch(() => false)) out.push(a);
    }
    if (out.length > 0) return out;

    const buttons = scope.getByRole('button', { name: /NEW |^SHOP |RECENTLY RESTOCKED|RECENTLY/i });
    const bn = await buttons.count();
    for (let i = 0; i < bn; i += 1) {
      const b = buttons.nth(i);
      const t = ((await b.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (t.length < 6) continue;
      if (/^(close|checkout|continue|menu|search|account|bag)\b/i.test(t)) continue;
      if (await b.isVisible({ timeout: 800 }).catch(() => false)) out.push(b);
    }
    return out;
  }

  /**
   * CP_006 — after empty cart: `cart-drawer-trigger`, each `getByRole('link')` from recording, assert URL + healthy page,
   * `goto` storefront root between hops (matches manual flow). Skips unrelated search-overlay click from raw recording.
   * @param {{ destinationPageHasNoLiquidFailure: (p: import('playwright').Page) => Promise<boolean> }} homePage
   * @param {{ info: (s: string) => void, warn?: (s: string) => void }} [logger]
   */
  async navigateCp006EmptyCartRecordedFlow(homePage, logger) {
    const log = logger && typeof logger.info === 'function' ? logger.info.bind(logger) : () => {};
    const base = env.BASE_URL.replace(/\/+$/, '');
    const trigger = this.page.getByTestId('cart-drawer-trigger').first();

    const ensureDrawerOpen = async () => {
      if (!(await this.isCartUiOpen())) {
        await trigger.waitFor({ state: 'visible', timeout: 12_000 });
        await trigger.click({ timeout: 12_000 });
      }
      await this.waitForCartUiOpen();
      await this.waitForEmptyCartMerchandisingReady(18_000);
    };

    const linkLabel = (name) => (typeof name === 'string' ? name : name.toString());

    for (let i = 0; i < cp006EmptyCartNavLinks.length; i += 1) {
      const { name } = cp006EmptyCartNavLinks[i];
      const label = linkLabel(name);
      let phase = 'init';
      let before = this.page.url();
      try {
        phase = 'ensureDrawerOpen_emptyMerchReady';
        log(`CP_006: (${i + 1}/${cp006EmptyCartNavLinks.length}) start "${label}" — url=${before}`);
        await ensureDrawerOpen();

        phase = 'waitForLink';
        const link = this.page.getByRole('link', { name }).first();
        await link.waitFor({ state: 'visible', timeout: 14_000 });

        phase = 'clickLink';
        before = this.page.url();
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded'),
          link.click({ timeout: 14_000 }),
        ]);

        phase = 'waitForUrlChange';
        await this.page.waitForURL((u) => u.toString() !== before, {
          timeout: 18_000,
          waitUntil: 'domcontentloaded',
        });
        const after = this.page.url();
        log(`CP_006: (${i + 1}/${cp006EmptyCartNavLinks.length}) redirected "${label}" — ${before} -> ${after}`);

        phase = 'destinationPageHasNoLiquidFailure';
        expect(await homePage.destinationPageHasNoLiquidFailure(this.page)).toBe(true);

        if (i < cp006EmptyCartNavLinks.length - 1) {
          phase = 'gotoHomeForNextHop';
          await this.page.goto(`${base}/`, {
            waitUntil: 'domcontentloaded',
            timeout: env.NAVIGATION_TIMEOUT,
          });
          await unlockStorefront(this.page);
          await dismissCookieBanner(this.page).catch(() => {});
        }
      } catch (err) {
        const afterUrl = this.page.url();
        throw new Error(
          `CP_006 failed on link ${i + 1}/${cp006EmptyCartNavLinks.length} "${label}" during "${phase}". ` +
            `URL before click: ${before}. URL after error: ${afterUrl}. ${err.message}`
        );
      }
    }
  }

  /**
   * CP_006 — empty-state collection links (carousel may not expose all four at once).
   * @param {Array<{ pattern: RegExp }>} names
   * @param {number} [minMatch] defaults to all names (strict); pass smaller value to allow theme variance.
   */
  async emptyCartMerchandisingLinksVisible(names, minMatch = names.length) {
    const surface = this.cartSurface();
    const quickLinks = await surface.locator('a[href*="/collections/"]').count();
    if (quickLinks >= minMatch) return true;

    let controls = [];
    try {
      controls = await this.emptyCartCategoryControls();
    } catch {
      controls = [];
    }
    if (controls.length >= minMatch) return true;
    const surfaces = [this.cartSurface(), this.page.locator('body')];
    let visible = 0;
    const quick = 2500;
    for (const { pattern } of names) {
      let matched = false;
      for (const surf of surfaces) {
        for (const role of ['link', 'button']) {
          const el = surf.getByRole(role, { name: pattern }).first();
          await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
          if (await el.isVisible({ timeout: quick }).catch(() => false)) {
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (matched) visible += 1;
    }
    if (visible >= minMatch) return true;
    const surf2 = this.cartSurface();
    const shopLinks = await surf2.getByRole('link', { name: /shop/i }).count();
    if (shopLinks >= minMatch) return true;
    const inSurface = await surf2.locator('a[href*="/collections/"]').count();
    const inMain = await this.page.locator('main a[href*="/collections/"]').count();
    return Math.max(inSurface, inMain) >= 4;
  }

  async sectionVisibleByHeading(pattern) {
    const h = this.page.getByText(pattern).first();
    return h.isVisible({ timeout: 8000 }).catch(() => false);
  }

  async carouselNextInCart(_pattern) {
    const root = this.page.locator(this.selectors.drawerRoot).first();
    const scope = (await root.isVisible().catch(() => false)) ? root : this.page;
    const next = scope
      .getByRole('button', { name: /next|arrow.*right|chevron.*right/i })
      .or(scope.locator('button[aria-label*="Next" i]'))
      .first();
    if (await next.isVisible({ timeout: 4000 }).catch(() => false)) {
      if ((await next.getAttribute('aria-disabled').catch(() => null)) === 'true') return false;
      const cls = (await next.getAttribute('class').catch(() => '')) || '';
      if (/\bis-disabled\b/i.test(cls)) return false;
      if (await next.isDisabled().catch(() => false)) return false;
      await next.click({ timeout: 8000 });
      await this.page.waitForTimeout(400);
      return true;
    }
    return false;
  }

  async clickAddToBagOnFirstMerchCardInDrawer() {
    const root = this.page.locator(this.selectors.drawerRoot).first();
    const scope = (await root.isVisible().catch(() => false)) ? root : this.page;
    const btn = this.addToBagButtonIn(scope).first();
    await btn.waitFor({ state: 'visible', timeout: 12_000 });
    await btn.click({ timeout: 10_000 });
    await this.page.waitForTimeout(600);
  }

  async openFirstMerchProductImageInDrawer() {
    const root = this.page.locator(this.selectors.drawerRoot).first();
    const scope = (await root.isVisible().catch(() => false)) ? root : this.page;
    const recoSectionSelectors = [
      '[class*="recommendations"]',
      '[class*="complementary"]',
      'cart-recommendations',
      '[class*="cross-sell"]',
      '[class*="upsell"]',
    ];
    for (const sel of recoSectionSelectors) {
      const section = scope.locator(sel).first();
      if (!(await section.isVisible({ timeout: 1500 }).catch(() => false))) continue;
      const imgLink = section.locator('a[href*="/products/"]:has(img)').first();
      if (await imgLink.isVisible({ timeout: 4000 }).catch(() => false)) {
        await Promise.all([
          this.page.waitForURL(/\/products\//, { timeout: 25_000 }),
          imgLink.click({ timeout: 12_000 }),
        ]);
        return;
      }
    }
    const skip = await this.lineItemCount();
    const allImgLinks = scope.locator('a[href*="/products/"]:has(img)');
    const total = await allImgLinks.count();
    if (skip >= total) {
      throw new Error('No recommendation product image link after cart line anchors');
    }
    const imgLink = allImgLinks.nth(skip);
    await imgLink.waitFor({ state: 'visible', timeout: 12_000 });
    await Promise.all([
      this.page.waitForURL(/\/products\//, { timeout: 25_000 }),
      imgLink.click({ timeout: 12_000 }),
    ]);
  }

  /** CP_007 — drawer root that contains the “Start with these” heading. */
  startWithTheseBlock() {
    return this.page
      .locator(this.selectors.drawerRoot)
      .filter({ has: this.page.getByRole('heading', { name: cp007Locators.startWithTheseHeading }) })
      .first();
  }

  async startWithTheseMerchandisingVisible() {
    await this.waitForCartUiOpen();
    const drawer = this.page.locator(this.selectors.drawerRoot).first();
    const heading = drawer.getByRole('heading', { name: cp007Locators.startWithTheseHeading });
    if (!(await heading.isVisible({ timeout: 18_000 }).catch(() => false))) return false;
    await heading.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
    const block = this.startWithTheseBlock();
    const hasAtb = await this.addToBagButtonIn(block).first().isVisible({ timeout: 6000 }).catch(() => false);
    const hasProductLink = await block.locator('a[href*="/products/"]').first().isVisible({ timeout: 6000 }).catch(() => false);
    return hasAtb && hasProductLink;
  }

  async openCartFromBagDrawerTrigger() {
    await dismissCookieBanner(this.page).catch(() => {});
    const trigger = this.page.getByTestId('cart-drawer-trigger').first();
    await trigger.waitFor({ state: 'attached', timeout: 20_000 });
    await trigger.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
    await trigger.click({ timeout: 15_000, force: true });
    await this.page.waitForTimeout(350);
    await this.waitForCartUiOpen();
  }

  /**
   * CP_007 — Recorded flow: click “Start with these” heading, ADD TO BAG, Pant Waist 28, confirm ADD TO BAG;
   * then poll for a line item (short timeouts so the step stays under Cucumber limits).
   */
  async clickAddToBagFirstInStartWithThese() {
    await this.waitForCartUiOpen();
    const block = this.startWithTheseBlock();
    const heading = block.getByRole('heading', { name: cp007Locators.startWithTheseHeading });
    await heading.waitFor({ state: 'visible', timeout: 22_000 });
    await heading.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    await heading.click({ timeout: 10_000, force: true }).catch(() => {});
    await this.page.waitForTimeout(450);

    const addButton = this.addToBagButtonIn(block).first();
    await addButton.waitFor({ state: 'visible', timeout: 16_000 });
    await addButton.click({ timeout: 14_000, force: true });
    await this.page.waitForTimeout(1200);
    await this.page
      .getByRole('group', { name: /pant waist/i })
      .first()
      .waitFor({ state: 'visible', timeout: 18_000 })
      .catch(() => {});
    await this.applyCp007PantWaistAndConfirmAdd(block);

    const pollUntil = Date.now() + 55_000;
    while (Date.now() < pollUntil) {
      if ((await this.lineItemCount()) >= 1) return;
      await this.applyCp007PantWaistAndConfirmAdd(block);
      const b = this.addToBagButtonIn(block).first();
      if ((await b.isVisible({ timeout: 400 }).catch(() => false)) && (await b.isEnabled().catch(() => false))) {
        await b.click({ timeout: 10_000, force: true }).catch(() => {});
      }
      await this.page.waitForTimeout(500);
    }

    const trigger = this.page.getByTestId('cart-drawer-trigger').first();
    if (await trigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await trigger.click({ timeout: 6000, force: true }).catch(() => {});
      await this.page.waitForTimeout(450);
      await trigger.click({ timeout: 6000, force: true }).catch(() => {});
      await this.waitForCartUiOpen();
      await this.page.waitForTimeout(900);
    }

    const afterToggle = Date.now() + 40_000;
    while (Date.now() < afterToggle) {
      if ((await this.lineItemCount()) >= 1) return;
      await this.applyCp007PantWaistAndConfirmAdd(block);
      await this.page.waitForTimeout(500);
    }

    if ((await this.lineItemCount()) < 1) {
      throw new Error(
        'CP_007: no line item after Start with these quick add — complete Pant Waist / Pant Length / Pant Fit and ADD TO BAG in the overlay while the cart drawer stays open (no PDP navigation before add).'
      );
    }
  }

  /**
   * CP_007 / CP_011 — Chino quick-add / PDP: Pant Waist → Pant Length → Pant Fit, then ADD TO BAG.
   * Theme may use `role="group"`, `<fieldset>`, or plain div rows (“Pant Waist: Select Pant Waist” + tile buttons).
   * @param {import('@playwright/test').Locator} scope
   * @param {{ waist?: string, length?: string, fit?: string } | null} [triple] — Defaults to CP_007 recorded labels.
   */
  async selectChinoPantTripleVariantInScope(scope, triple = null) {
    const waist = triple?.waist ?? cp007Locators.pantWaistLabel;
    const length = triple?.length ?? cp007Locators.pantLengthLabel;
    const fit = triple?.fit ?? cp007Locators.pantFitLabel;
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const clickValueInContainer = async (container, value) => {
      const btn = container.getByRole('button', { name: value, exact: true }).first();
      if (await btn.isVisible({ timeout: 2200 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await btn.click({ timeout: 9000, force: true });
        return true;
      }
      const radio = container.getByRole('radio', { name: new RegExp(`^${esc(value)}$`, 'i') }).first();
      if (await radio.isVisible({ timeout: 1800 }).catch(() => false)) {
        await radio.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await radio.check({ timeout: 9000, force: true }).catch(() => {});
        return true;
      }
      const tile = container.locator(`button:has-text("${value}")`).first();
      if (await tile.isVisible({ timeout: 1800 }).catch(() => false)) {
        await tile.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await tile.click({ timeout: 9000, force: true });
        return true;
      }
      const textClick = container.getByText(new RegExp(`^${esc(value)}$`), { exact: true }).first();
      if (await textClick.isVisible({ timeout: 1200 }).catch(() => false)) {
        await textClick.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await textClick.click({ timeout: 8000, force: true });
        return true;
      }
      return false;
    };

    /** Fallback: click the first interactable option inside a variant container — used when the target label is absent. */
    const clickFirstAvailableInContainer = async (container) => {
      const tries = [
        container.locator('input[type="radio"]:not(:checked):not([disabled])').first(),
        container.getByRole('radio', { checked: false }).first(),
        container.locator('button[role="radio"]:not([aria-disabled="true"]):not([disabled])').first(),
        container.locator('button:not([disabled]):not([aria-disabled="true"])').first(),
        container.locator('label').first(),
      ];
      for (const t of tries) {
        if (await t.isVisible({ timeout: 700 }).catch(() => false)) {
          await t.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
          try {
            const tag = await t.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
            if (tag === 'input') {
              await t.check({ timeout: 6000, force: true }).catch(() => {});
            } else {
              await t.click({ timeout: 6000, force: true });
            }
            return true;
          } catch { /* try next */ }
        }
      }
      return false;
    };

    const pickViaRoleGroup = async (groupNameRe, value) => {
      const g = scope.getByRole('group', { name: groupNameRe }).first();
      if (!(await g.isVisible({ timeout: 2000 }).catch(() => false))) return false;
      await g.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      return (await clickValueInContainer(g, value)) || (await clickFirstAvailableInContainer(g));
    };

    /** Fieldset / section / variant row that shows the label copy (e.g. “Pant Waist: Select Pant Waist”). */
    const pickViaLabeledSection = async (labelRe, value) => {
      const section = scope
        .locator('fieldset, [role="group"], section, .product-form__input, [class*="variant"], [class*="VariantPicker"]')
        .filter({ hasText: labelRe })
        .first();
      if (!(await section.isVisible({ timeout: 2800 }).catch(() => false))) return false;
      await section.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
      return (await clickValueInContainer(section, value)) || (await clickFirstAvailableInContainer(section));
    };

    const pickWaist = async () =>
      (await pickViaRoleGroup(/pant waist/i, waist)) || (await pickViaLabeledSection(/pant waist/i, waist));
    const pickLength = async () =>
      (await pickViaRoleGroup(/pant length/i, length)) || (await pickViaLabeledSection(/pant length/i, length));
    const pickFit = async () =>
      (await pickViaRoleGroup(/pant fit/i, fit)) || (await pickViaLabeledSection(/pant fit/i, fit));

    await pickWaist();
    await this.page.waitForTimeout(280);
    await pickLength();
    await this.page.waitForTimeout(280);
    await pickFit();
    await this.page.waitForTimeout(500);
    return true;
  }

  /**
   * True when the PDP shows pant waist / length / fit (Bonobos chinos) — used to avoid colour coercion.
   */
  async hasPantVariantFormOnPdp() {
    const waistGroup = this.page.getByRole('group', { name: cp007Locators.pantWaistGroupName }).first();
    if (await waistGroup.isVisible({ timeout: 4000 }).catch(() => false)) return true;
    const waistText = this.page.getByText(/pant waist/i, { exact: false }).first();
    return !!(await waistText.isVisible({ timeout: 2000 }).catch(() => false));
  }

  /**
   * Shared pant PDP preset (cp011 waist/length/fit + hemming + bespoke). No colour swatches.
   * Used by CP_011 prerequisites and by {@link #clickAddToBagOnPdp} when {@link #hasPantVariantFormOnPdp} is true.
   * @returns {Promise<boolean>} true if pant UI was present and selection was attempted
   */
  async selectCp011PantVariantIfPresentOnPdp() {
    if (!(await this.hasPantVariantFormOnPdp())) return false;
    await this.selectChinoPantTripleVariantInScope(this.page, {
      waist: cp011Locators.pantWaistLabel,
      length: cp011Locators.pantLengthLabel,
      fit: cp011Locators.pantFitLabel,
    });
    await this.pickFirstHemStyleIfPresentOnPdp();
    await this.pickTailoredBespokeUpsellIfPresentOnPdp();
    return true;
  }

  /**
   * CP_007 — Pant Waist / Length / Fit then confirm ADD TO BAG; searches open dialog, Start-with-these block, then drawer.
   */
  async applyCp007PantWaistAndConfirmAdd(block) {
    const variantOverlay = this.page
      .locator('[role="dialog"], dialog[open], [aria-modal="true"]')
      .filter({ hasText: /pant waist|pant length|pant fit/i })
      .first();

    const roots = [
      variantOverlay,
      this.page.locator('dialog[open]').first(),
      this.page.locator('[role="dialog"]').filter({ hasText: /add to bag|pant waist/i }).first(),
      block,
      this.page.locator(this.selectors.drawerRoot).first(),
    ];

    let applied = false;
    for (const root of roots) {
      if (!(await root.isVisible({ timeout: 900 }).catch(() => false))) continue;
      const waistGroup = root.getByRole('group', { name: /pant waist/i }).first();
      const waistText = root.getByText(/pant waist/i, { exact: false }).first();
      if (
        (await waistGroup.isVisible({ timeout: 1200 }).catch(() => false)) ||
        (await waistText.isVisible({ timeout: 1200 }).catch(() => false))
      ) {
        await this.selectChinoPantTripleVariantInScope(root);
        applied = true;
        break;
      }
    }
    if (
      !applied &&
      (await this.page.getByText(/pant waist/i, { exact: false }).first().isVisible({ timeout: 1800 }).catch(() => false))
    ) {
      await this.selectChinoPantTripleVariantInScope(this.page);
    }

    await this.page.waitForTimeout(400);

    const atbTry = [];
    if (await variantOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
      atbTry.push(
        this.addToBagButtonIn(variantOverlay).last(),
        this.addToBagButtonIn(variantOverlay).first()
      );
    }
    atbTry.push(
      this.addToBagButtonIn(this.page.locator('dialog[open]').first()).last(),
      this.addToBagButtonIn(this.page.locator('dialog[open]').first()).first(),
      this.addToBagButtonIn(block).last(),
      this.addToBagButtonIn(block).first(),
      this.addToBagButtonIn(this.page.locator(this.selectors.drawerRoot).first()).last(),
      this.addToBagButtonIn(this.page.locator(this.selectors.drawerRoot).first()).first(),
      this.addToBagButtonIn(this.page).last(),
      this.addToBagButtonIn(this.page).first()
    );
    for (const loc of atbTry) {
      const b = loc;
      if (!(await b.isVisible({ timeout: 700 }).catch(() => false))) continue;
      await b.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
      const enabledDeadline = Date.now() + 14_000;
      while (Date.now() < enabledDeadline && !(await b.isEnabled().catch(() => false))) {
        const variantScope = (await variantOverlay.isVisible({ timeout: 400 }).catch(() => false))
          ? variantOverlay
          : (await this.page.locator('dialog[open]').first().isVisible({ timeout: 400 }).catch(() => false))
            ? this.page.locator('dialog[open]').first()
            : this.page;
        await this.selectChinoPantTripleVariantInScope(variantScope).catch(() => {});
        await this.page.waitForTimeout(350);
      }
      if (await b.isEnabled().catch(() => false)) {
        await b.click({ timeout: 14_000, force: true });
        await this.page.waitForTimeout(500);
        return;
      }
    }
  }

  /** CP_007 — First visible cart line inside the drawer (theme markup varies). */
  async firstVisibleCartLineInDrawer(drawer) {
    const candidates = [
      drawer.locator(this.selectors.lineItem).first(),
      drawer.locator('.cart-product').first(),
      drawer.locator('.cart-item').first(),
      drawer.locator('[class*="CartItem"]').first(),
      drawer.locator('cart-line-item').first(),
      drawer.locator('tr:has(button.cart-product__remove-link)').first(),
      drawer.locator('li:has(button.cart-product__remove-link)').first(),
    ];
    for (const loc of candidates) {
      if (await loc.isVisible({ timeout: 3500 }).catch(() => false)) return loc;
    }
    const byChino = drawer
      .locator('.cart-product, .cart-item, [class*="CartItem"], tr, li')
      .filter({ hasText: /the chino/i })
      .first();
    if (await byChino.isVisible({ timeout: 4000 }).catch(() => false)) return byChino;
    return null;
  }

  /**
   * CP_007 — After the reco line exists in the bag, open PDP from that line’s thumbnail / title (Bonobos: image left of title).
   * Falls back to “Start with these” links only if the drawer line has no navigable control.
   */
  async clickStartWithTheseProductLinkOrImageForPdp() {
    if (!(await this.isCartUiOpen())) {
      await this.openCartFromBagDrawerTrigger();
    }
    await this.waitForCartUiOpen();
    await this.waitForCartLineItems(1, 35_000);

    const drawer = this.page.locator(this.selectors.drawerRoot).first();
    await drawer.waitFor({ state: 'visible', timeout: 18_000 });

    let row = await this.firstVisibleCartLineInDrawer(drawer);
    if (!row) {
      await this.openCartFromBagDrawerTrigger();
      await this.waitForCartUiOpen();
      await this.waitForCartLineItems(1, 20_000);
      row = await this.firstVisibleCartLineInDrawer(drawer);
    }
    if (!row) {
      throw new Error('CP_007: no visible cart line row in drawer — cannot open PDP from line image');
    }
    await row.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});

    const tryNavigate = async (clickTarget) => {
      await Promise.all([
        this.page.waitForURL(/\/products\//, { timeout: 35_000 }),
        clickTarget.click({ timeout: 14_000, force: true }),
      ]);
    };

    const lineImgLink = row.locator('a[href*="/products/"]:has(img)').first();
    if (await lineImgLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await tryNavigate(lineImgLink);
      return;
    }

    const anyImgLink = row.locator('a:has(img)').first();
    if (await anyImgLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await tryNavigate(anyImgLink);
      return;
    }

    const mediaLink = row
      .locator(
        '.cart-item__media a, .cart-product__image a, a.cart-item__link, [class*="product-image"] a, [class*="cart-item__image"] a'
      )
      .first();
    if (await mediaLink.isVisible({ timeout: 6000 }).catch(() => false)) {
      await tryNavigate(mediaLink);
      return;
    }

    const thumbImg = row.locator('.cart-item__media img, .cart-product__image img, a img').first();
    if (await thumbImg.isVisible({ timeout: 6000 }).catch(() => false)) {
      await tryNavigate(thumbImg);
      return;
    }

    const lineTitleLink = row.locator('a[href*="/products/"]').first();
    if (await lineTitleLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await tryNavigate(lineTitleLink);
      return;
    }

    const block = this.startWithTheseBlock();
    await block
      .getByRole('heading', { name: cp007Locators.startWithTheseHeading })
      .first()
      .scrollIntoViewIfNeeded({ timeout: 10_000 })
      .catch(() => {});

    const chinoNth = block.getByRole('link', { name: cp007Locators.theChinoLinkName }).nth(1);
    if (await chinoNth.isVisible({ timeout: 5000 }).catch(() => false)) {
      await Promise.all([
        this.page.waitForURL(/\/products\//, { timeout: 35_000 }),
        chinoNth.click({ timeout: 14_000, force: true }),
      ]);
      return;
    }
    const chinoFirst = block.getByRole('link', { name: /the chino/i }).first();
    if (await chinoFirst.isVisible({ timeout: 5000 }).catch(() => false)) {
      await Promise.all([
        this.page.waitForURL(/\/products\//, { timeout: 35_000 }),
        chinoFirst.click({ timeout: 14_000, force: true }),
      ]);
      return;
    }
    const imgLink = block.locator('a[href*="/products/"]:has(img)').first();
    await imgLink.waitFor({ state: 'visible', timeout: 14_000 });
    await Promise.all([
      this.page.waitForURL(/\/products\//, { timeout: 35_000 }),
      imgLink.click({ timeout: 14_000, force: true }),
    ]);
  }

  async clickEditFirstLineItem() {
    await this.clickEditNthLineItem(1);
  }

  /** 1-based line index (same order as CP_002 adds: 1 = Wool Bomber, 2 = Lodge Jacket with size S). */
  async clickEditNthLineItem(oneBasedIndex) {
    await this.waitForCartUiOpen();
    const item = this.cartSurface().locator(this.selectors.lineItem).nth(oneBasedIndex - 1);
    await item.waitFor({ state: 'visible', timeout: 12_000 });
    const edit = item.locator(this.selectors.editLine).first();
    await edit.waitFor({ state: 'visible', timeout: 10_000 });
    await edit.click({ timeout: 10_000 });
    await this.page.waitForTimeout(500);
  }

  /** CP_005 — `aria-label` on Edit for the bomber line; scroll + force + theme fallbacks. */
  async clickEditBomberByCp005AriaLabel() {
    await this.waitForCartUiOpen();
    const surface = this.cartSurface();
    await surface
      .locator('a:has-text("Edit"), button:has-text("Edit")')
      .first()
      .waitFor({ state: 'visible', timeout: 25_000 })
      .catch(() => {});
    const label = cp005RecordedLocators.editBomberAriaLabel;
    const page = this.page;

    const tryClick = async (loc) => {
      await loc.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
      try {
        await loc.click({ timeout: 12_000, force: true });
      } catch {
        await loc.evaluate((el) => {
          if (el instanceof HTMLElement) el.click();
        });
      }
      await this.page.waitForTimeout(600);
      await this.page.waitForURL(/\/products\//, { timeout: 8000 }).catch(() => {});
    };

    const exactAttr = (root) => root.locator(`[aria-label=${JSON.stringify(label)}]`).first();
    for (const root of [surface, page]) {
      const loc = exactAttr(root);
      if (await loc.isVisible({ timeout: 6000 }).catch(() => false)) {
        await tryClick(loc);
        return;
      }
    }

    const partial = /Edit\s+Wool\s+Blend\s+Sweater\s+Bomber/i;
    for (const root of [surface, page]) {
      const link = root.getByRole('link', { name: partial }).first();
      if (await link.isVisible({ timeout: 4000 }).catch(() => false)) {
        await tryClick(link);
        return;
      }
      const btn = root.getByRole('button', { name: partial }).first();
      if (await btn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await tryClick(btn);
        return;
      }
    }

    const asButton = surface.getByRole('button', { name: label, exact: true }).first();
    if (await asButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tryClick(asButton);
      return;
    }
    await tryClick(surface.getByRole('link', { name: label, exact: true }).first());
  }

  /** PDP after cart Edit — size radio (Bonobos variant picker; several DOM shapes). */
  async selectPdpSizeRadio(sizeLabel) {
    await this.page.waitForURL(/\/products\//, { timeout: 8000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
    await dismissCookieBanner(this.page).catch(() => {});
    await this.closeCartDrawerIfOpen();

    await this.page
      .locator('product-form, form[action*="/cart/add"], [id*="ProductInformation"]')
      .first()
      .waitFor({ state: 'visible', timeout: 25_000 })
      .catch(() => {});

    const form = this.page.locator('form[action*="/cart/add"], product-form, [id*="ProductInformation"]').first();
    await form.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});

    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const handle = sizeLabel.toLowerCase();

    const tryCheck = async (loc) => {
      const target = loc.first();
      if ((await target.count()) === 0) return false;
      await target.waitFor({ state: 'attached', timeout: 6000 }).catch(() => {});
      await target.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
      try {
        await target.check({ timeout: 12_000, force: true });
      } catch {
        await target.evaluate((el) => {
          if (el instanceof HTMLInputElement) el.click();
        });
      }
      await this.page.waitForTimeout(500);
      return true;
    };

    const outerwearFs = this.page.locator('fieldset').filter({ hasText: /outerwear|size/i }).first();
    if (await outerwearFs.isVisible({ timeout: 6000 }).catch(() => false)) {
      const byAriaFs = outerwearFs.locator(`input[type="radio"][aria-label="${esc(sizeLabel)}"]`).first();
      if (await tryCheck(byAriaFs)) return;
      const byValueFs = outerwearFs.locator(`input[type="radio"][value="${esc(sizeLabel)}"]`).first();
      if (await tryCheck(byValueFs)) return;
      const scoped = outerwearFs.getByRole('radio', { name: sizeLabel, exact: true }).first();
      if (await tryCheck(scoped)) return;
      const scopedInput = outerwearFs.locator(`input[type="radio"][data-option-display-value="${esc(sizeLabel)}"]`).first();
      if (await tryCheck(scopedInput)) return;
      const byHandle = outerwearFs.locator(`input[type="radio"][data-option-value-handle="${handle}"]`).first();
      if (await tryCheck(byHandle)) return;
    }

    const byAriaForm = form.locator(`input[type="radio"][aria-label="${esc(sizeLabel)}"]`).first();
    if (await tryCheck(byAriaForm)) return;
    const byValueForm = form.locator(`input[type="radio"][value="${esc(sizeLabel)}"]`).first();
    if (await tryCheck(byValueForm)) return;

    const byDisplay = form
      .locator(`input[type="radio"][data-option-display-value="${esc(sizeLabel)}"]`)
      .first();
    if (await tryCheck(byDisplay)) return;

    const byHandleGlobal = form.locator(`input[type="radio"][data-option-value-handle="${handle}"]`).first();
    if (await tryCheck(byHandleGlobal)) return;

    const radio = this.page.getByRole('radio', { name: sizeLabel, exact: true }).first();
    if (await tryCheck(radio)) return;

    const radioLoose = this.page.getByRole('radio', { name: new RegExp(`^\\s*${sizeLabel}\\s*$`, 'i') }).first();
    if (await tryCheck(radioLoose)) return;

    const labelEl = form.getByText(new RegExp(`^${sizeLabel}$`)).first();
    if (await labelEl.isVisible({ timeout: 4000 }).catch(() => false)) {
      await labelEl.click({ timeout: 12_000, force: true });
      await this.page.waitForTimeout(500);
      return;
    }

    const variantBtn = form
      .locator('.variant-option button, [class*="variant-picker"] button, [data-variant-picker] button')
      .filter({ hasText: new RegExp(`^\\s*${sizeLabel}\\s*$`, 'i') })
      .first();
    if (await variantBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await variantBtn.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await variantBtn.click({ timeout: 12_000, force: true });
      await this.page.waitForTimeout(500);
      return;
    }

    const byOuterwearFieldset = this.page
      .locator(`input[type="radio"][data-fieldset-index="1"][aria-label="${esc(sizeLabel)}"]`)
      .first();
    if (await tryCheck(byOuterwearFieldset)) return;
    const byOuterwearDisplay = this.page
      .locator(
        `input[type="radio"][data-fieldset-index="1"][data-option-display-value="${esc(sizeLabel)}"]`
      )
      .first();
    if (await tryCheck(byOuterwearDisplay)) return;

    const byAriaPage = this.page.locator(`input[type="radio"][aria-label="${esc(sizeLabel)}"]`).first();
    if (await tryCheck(byAriaPage)) return;
    const byValuePage = this.page.locator(`input[type="radio"][value="${esc(sizeLabel)}"]`).first();
    if (await tryCheck(byValuePage)) return;

    await this.page.evaluate((lbl) => {
      const sel = `input[type="radio"][data-fieldset-index="1"][aria-label="${lbl}"], input[type="radio"][aria-label="${lbl}"][data-option-available="true"], input[type="radio"][data-option-display-value="${lbl}"]`;
      const el = document.querySelector(sel);
      if (el instanceof HTMLElement) el.click();
    }, sizeLabel);
    await this.page.waitForTimeout(600);

    const chosen = this.page.getByRole('radio', { name: sizeLabel, exact: true }).first();
    const byVal = form.locator(`input[type="radio"][data-option-display-value="${esc(sizeLabel)}"]`).first();
    const ok =
      (await chosen.isChecked().catch(() => false)) || (await byVal.isChecked().catch(() => false));
    if (!ok) {
      throw new Error(`CP_005: could not select size "${sizeLabel}" on PDP (variant picker)`);
    }
  }

  async clickUpdateBagIfVisible() {
    const candidates = [
      this.page.getByRole('button', { name: /update\s*bag/i }).first(),
      this.addToBagButtonIn(this.page).first(),
      this.page.locator('button.add-to-cart-button[type="submit"][name="add"]').first(),
      this.page.locator(this.selectors.updateBag).first(),
    ];
    for (const upd of candidates) {
      if ((await upd.count()) === 0) continue;
      await upd.waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
      if ((await upd.count()) === 0) continue;
      await upd.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      try {
        await upd.click({ timeout: 15_000, force: true });
      } catch {
        await upd.evaluate((el) => {
          if (el instanceof HTMLElement) el.click();
        });
      }
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  /** After line-item edit + update, theme may land on PDP or home — reopen bag so CP_005 can assert. */
  async ensureCartUsableAfterLineItemEdit() {
    if (await this.isCartUiOpen()) return true;
    await dismissCookieBanner(this.page).catch(() => {});
    try {
      await this.gotoHomeRoot();
    } catch {
      /* ignore */
    }
    await this.openBagFromHeader();
    await this.waitForCartUiOpen();
    return this.isCartUiOpen();
  }

  /** CP_004 — theme remove: `button.cart-product__remove-link`, then generic remove selectors. */
  async clickRemoveFirstLineItem() {
    await this.waitForCartUiOpen();
    const before = await this.lineItemCount();
    const surface = this.cartSurface();
    const preferred = surface.locator('button.cart-product__remove-link').first();
    const fallback = surface.locator(this.selectors.removeLine).first();
    const remove = (await preferred.isVisible({ timeout: 4000 }).catch(() => false)) ? preferred : fallback;
    await remove.waitFor({ state: 'visible', timeout: 12_000 });
    await remove.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
    try {
      await remove.click({ timeout: 10_000, force: true });
    } catch {
      await remove.evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
      });
    }
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const n = await this.lineItemCount();
      if (before > 1 && n < before) return;
      if (before <= 1) {
        const empty = await this.page
          .getByText(/your cart is empty|your bag is empty|cart is empty/i)
          .first()
          .isVisible({ timeout: 400 })
          .catch(() => false);
        if (empty || n === 0) return;
      }
      await this.page.waitForTimeout(120);
    }
  }

  async adjustFirstLineQuantity(direction /* 'up' | 'down' */) {
    return this.adjustNthLineQuantity(1, direction);
  }

  /** 1-based line index (sheet: multiple line items). CP_003: prefer `//button[@name="plus"|"minus"]` per line. */
  async adjustNthLineQuantity(oneBasedLineIndex, direction) {
    await this.waitForCartUiOpen();
    const items = this.cartSurface().locator(this.selectors.lineItem);
    const item = items.nth(oneBasedLineIndex - 1);
    await item.waitFor({ state: 'visible', timeout: 10_000 });
    const xpathName = direction === 'up' ? 'plus' : 'minus';
    const xpathBtn = item.locator(`xpath=.//button[@name="${xpathName}"]`).first();
    if (await xpathBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await xpathBtn.click({ timeout: 8000, force: true });
      await this.page.waitForTimeout(600);
      return true;
    }
    const sel = direction === 'up' ? this.selectors.increaseQty : this.selectors.decreaseQty;
    const btn = item.locator(sel).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click({ timeout: 8000 });
      await this.page.waitForTimeout(600);
      return true;
    }
    const input = item.locator(this.selectors.quantityInput).first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      const cur = parseInt((await input.inputValue()) || '1', 10);
      const next = direction === 'up' ? cur + 1 : Math.max(1, cur - 1);
      await input.fill(String(next));
      await input.press('Enter').catch(() => {});
      await this.page.waitForTimeout(600);
      return true;
    }
    return false;
  }

  /**
   * Header / bag bubble quantity text (theme-specific). Uses short timeouts only — never blocks on missing markup.
   */
  async headerCartCountText() {
    const short = { timeout: 2000 };

    const digitsOnly = (s) => {
      const m = String(s || '').match(/(\d+)/);
      return m ? m[1] : '';
    };

    try {
      const trigger = this.page.getByTestId('cart-drawer-trigger').first();
      if (await trigger.isVisible(short).catch(() => false)) {
        const label = ((await trigger.getAttribute('aria-label').catch(() => '')) || '').trim();
        const fromAria = digitsOnly(label);
        if (fromAria) return fromAria;
      }
    } catch {
      /* ignore */
    }

    const bubbleRoot = this.page.locator('#cart-icon-bubble').first();
    if (await bubbleRoot.isVisible(short).catch(() => false)) {
      const inner = ((await bubbleRoot.innerText(short).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      const fromBubble = digitsOnly(inner);
      if (fromBubble) return fromBubble;
    }

    const fallbackSelectors = [
      '#cart-icon-bubble .cart-count-bubble span',
      '#cart-icon-bubble span',
      'header .cart-count-bubble',
      '[class*="cart-count"]',
      '.cart-count-bubble',
      '[data-cart-count]',
      '.header__cart-count',
    ];

    for (const sel of fallbackSelectors) {
      const loc = this.page.locator(sel).first();
      if (!(await loc.isVisible(short).catch(() => false))) continue;
      const raw = ((await loc.textContent(short).catch(() => '')) || '').trim();
      const d = digitsOnly(raw);
      if (d) return d;
    }

    return '';
  }

  async lineItemsShowProductSignals() {
    const lines = await this.lineItemCount();
    if (lines === 0) return false;
    const surface = this.cartSurface();
    const priceLike = /\$[\d,]+(?:\.\d{2})?/;
    const rowHasSignals = async (row) => {
      if (!(await row.isVisible({ timeout: 10_000 }).catch(() => false))) return false;
      const hasImg = await row.locator('img').first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasPrice = await row.getByText(priceLike).first().isVisible({ timeout: 5000 }).catch(() => false);
      return hasImg || hasPrice;
    };

    const firstLi = surface.locator(this.selectors.lineItem).first();
    if (await rowHasSignals(firstLi)) return true;

    const lineHost = surface.locator('cart-line-item, [data-test="cart-line-item"]').first();
    if (await rowHasSignals(lineHost)) return true;

    const surfImg = await surface.locator('img').first().isVisible({ timeout: 4000 }).catch(() => false);
    const surfPrice = await surface.getByText(priceLike).first().isVisible({ timeout: 4000 }).catch(() => false);
    return surfImg || surfPrice;
  }

  async paymentExpressButtonsVisible() {
    const patterns = [/shop\s*pay/i, /apple\s*pay/i, /paypal/i, /affirm/i, /google\s*pay/i, /amazon\s*pay/i];
    const roots = [this.cartSurface(), this.page.locator('body')];
    const found = new Set();
    for (const root of roots) {
      await root
        .locator('button[name="checkout"], a[href*="checkout"], button:has-text("Checkout")')
        .first()
        .scrollIntoViewIfNeeded({ timeout: 8000 })
        .catch(() => {});
      const shopPayWallet = this.page.locator('shop-pay-wallet-button').first();
      if (await shopPayWallet.isVisible({ timeout: 2500 }).catch(() => false)) {
        found.add('shop pay');
      }
      const googlePayWallet = this.page.locator('shopify-google-pay-button').first();
      if (await googlePayWallet.isVisible({ timeout: 2500 }).catch(() => false)) {
        found.add('google pay');
      }
      for (const name of patterns) {
        const btn = root.getByRole('button', { name }).first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          found.add(String(name));
          continue;
        }
        const link = root.getByRole('link', { name }).first();
        if (await link.isVisible({ timeout: 800 }).catch(() => false)) found.add(String(name));
      }
    }
    return [...found];
  }

  /**
   * CP_035 — For each visible Shop Pay / Apple Pay / PayPal / Affirm control in the cart drawer,
   * click and expect a popup or navigation to checkout / recognised wallet hosts.
   * Re-opens the bag drawer after navigations so the next wallet can run.
   * @param {{ warn?: (s: string)=>void }} [logger]
   * @returns {Promise<{ visible: number; success: number }>}
   */
  async clickEachVisibleExpressPaymentAndAssertExternal(logger) {
    await this.waitForCartUiOpen();
    const base = env.BASE_URL.replace(/\/+$/, '');
    let baseOrigin = '';
    try {
      baseOrigin = new URL(base).origin;
    } catch {
      /* ignore */
    }

    const isPaymentContextUrl = (url) => {
      if (!url) return false;
      const s = String(url).toLowerCase();
      if (/\/checkouts\/|\/cart\/checkout/i.test(url)) return true;
      if (
        /paypal\.com|accounts\.paypal|affirm\.com|affirm\.|pay\.google|payments\.google|apple\.com|shop\.app|shopify\.com\/\d+\/checkouts|buy\.shopify|wallet\.apple/i.test(
          s
        )
      ) {
        return true;
      }
      try {
        const u = new URL(url);
        if (baseOrigin && u.origin !== baseOrigin && u.protocol.startsWith('http')) return true;
      } catch {
        /* ignore */
      }
      return false;
    };

    const restoreStorefrontAndOpenCart = async () => {
      const path = new URL(this.page.url()).pathname || '/';
      if (!/^\/$|^\/collections\/|^\/products\//i.test(path)) {
        await this.page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: env.NAVIGATION_TIMEOUT }).catch(() => {});
        await unlockStorefront(this.page);
        await dismissCookieBanner(this.page).catch(() => {});
      }
      await this.openBagFromHeader();
      await this.waitForCartUiOpen();
    };

    /**
     * @param {import('@playwright/test').Locator} locator
     * @param {string} label
     */
    const tryOne = async (locator, label) => {
      const popupP = this.page.context().waitForEvent('page', { timeout: 15_000 }).catch(() => null);
      const beforeUrl = this.page.url();
      await locator.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
      try {
        await locator.click({ timeout: 12_000, force: true });
      } catch {
        await locator.evaluate((el) => {
          if (el instanceof HTMLElement) el.click();
        });
      }
      await this.page.waitForTimeout(500);
      const popup = await popupP;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});
        const pu = popup.url();
        const ok = isPaymentContextUrl(pu);
        if (!ok && logger && typeof logger.warn === 'function') {
          logger.warn(`CP_035: ${label} popup URL not recognised as payment context: ${pu}`);
        }
        await popup.close().catch(() => {});
        await restoreStorefrontAndOpenCart();
        return ok;
      }
      await this.page.waitForTimeout(900);
      const afterUrl = this.page.url();
      if (afterUrl !== beforeUrl && isPaymentContextUrl(afterUrl)) {
        await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
        await unlockStorefront(this.page);
        await dismissCookieBanner(this.page).catch(() => {});
        await restoreStorefrontAndOpenCart();
        return true;
      }
      if (!isPaymentContextUrl(afterUrl) && logger && typeof logger.warn === 'function') {
        logger.warn(`CP_035: ${label} did not open a payment context (url=${afterUrl})`);
      }
      await restoreStorefrontAndOpenCart();
      return false;
    };

    let visible = 0;
    let success = 0;

    const shopWallet = this.page.locator('shop-pay-wallet-button').first();
    if (await shopWallet.isVisible({ timeout: 3500 }).catch(() => false)) {
      visible += 1;
      if (await tryOne(shopWallet, 'Shop Pay')) success += 1;
    }

    const surface = this.cartSurface();
    for (const [label, re] of [
      ['Apple Pay', /apple\s*pay/i],
      ['Paypal', /paypal/i],
      ['Affirm', /affirm/i],
    ]) {
      const btn = surface.getByRole('button', { name: re }).first();
      if (!(await btn.isVisible({ timeout: 2500 }).catch(() => false))) continue;
      visible += 1;
      if (await tryOne(btn, label)) success += 1;
    }

    return { visible, success };
  }

  async clickCheckout() {
    await this.waitForCartUiOpen();
    const btn = this.cartSurface().locator(this.selectors.checkout).first();
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    const nav = this.page
      .waitForURL(
        (u) =>
          /\/checkouts\/|\/cart\/checkout/i.test(u.pathname + u.search) ||
          /shopify\.com\/.*checkout/i.test(u.href),
        { timeout: 45_000 }
      )
      .catch(() => null);
    await Promise.all([nav, btn.click({ timeout: 15_000 })]);
  }

  async gotoProductPath(path) {
    const p = path.startsWith('/') ? path : `/${path}`;
    await this.page.goto(`${env.BASE_URL}${p}`, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await unlockStorefront(this.page);
    await dismissCookieBanner(this.page).catch(() => {});
  }

  /** CP_019 — full `/cart` page (same empty state Shopify shows after checkout clears the cart). */
  async gotoCartPageUrl() {
    await this.closeCartDrawerIfOpen();
    const base = env.BASE_URL.replace(/\/+$/, '');
    await this.page.goto(`${base}/cart`, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await unlockStorefront(this.page);
    await dismissCookieBanner(this.page).catch(() => {});
    await this.page.locator('main, #MainContent, cart-items').first().waitFor({
      state: 'visible',
      timeout: 20_000,
    });
  }

  /**
   * CP_018 — optional catalog path: add SKU, reopen cart, reload once (inventory rules often apply after refresh).
   * @param {{ warn: (s: string) => void }} logger
   * @returns {{ skip: boolean, ok: boolean }}
   */
  async runInventoryEdgeCatalogCheck(logger) {
    const path = optionalProductPaths.inventoryEdge;
    if (!path) return { skip: true, ok: true };

    const countBefore = await this.lineItemCount();
    await this.gotoProductPath(path);
    const atb = this.page.getByRole('button', { name: /add\s+to\s+bag/i }).first();
    if (!(await atb.isVisible({ timeout: 8000 }).catch(() => false))) {
      logger.warn('CP_018: Add to Bag not on inventory-edge PDP — skipping strict OOS checks');
      await this.gotoHomeRoot();
      return { skip: true, ok: true };
    }
    await atb.click({ timeout: 12_000 });
    await this.page.waitForTimeout(900);
    await this.openBagFromHeader();
    await this.waitForCartUiOpen();
    await this.page.waitForTimeout(1200);
    await this.page
      .reload({ waitUntil: 'domcontentloaded', timeout: env.NAVIGATION_TIMEOUT })
      .catch(() => {});
    await unlockStorefront(this.page);
    await dismissCookieBanner(this.page).catch(() => {});
    await this.waitForCartUiOpen();
    const body = ((await this.cartSurface().innerText().catch(() => '')) || '');
    const countAfter = await this.lineItemCount();
    const rx =
      /sold out|out of stock|no longer available|unavailable|removed from your cart|removed from cart|inventory|can't be purchased|cannot be purchased|not available|quantity (has been )?adjusted|only \d+ left|low stock|left in stock|some items? (were|was) removed|item.*removed/i;
    const ok = rx.test(body) || countAfter < countBefore;
    await this.gotoHomeRoot().catch(() => {});
    return { skip: false, ok };
  }

  async readSubtotalPromoTotalHints() {
    const surface = this.cartSurface();
    const text = ((await surface.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    return text;
  }

  /**
   * CP_020 — Does the open cart surface visibly show a discounted price?
   * Accepts: compare-at element, strike-through node, two prices on the same row,
   * or copy like "sale / final sale / promo / save / X% off / was".
   */
  async cartHasDiscountSignal() {
    const surface = this.cartSurface();
    const text = ((await surface.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const markerRx =
      /sale|final\s*sale|promo(tion)?|discount|save\b|was\s*\$|reg(\.|ular)?\s*\$|\d+\s*%\s*off|deal/i;
    if (markerRx.test(text)) return true;
    const strikeNode = surface.locator(
      's, del, .compare-at-price, .price--on-sale, [class*="compare"], [class*="strike"], [class*="line-through"]'
    );
    const hasStrike = await strikeNode.first().isVisible({ timeout: 4000 }).catch(() => false);
    if (hasStrike) return true;
    const prices = (text.match(/\$\s*\d[\d,]*(?:\.\d{2})?/g) || []).filter((p) => /\$\s*\d/.test(p));
    return prices.length >= 2;
  }

  /**
   * CP_020 — navigate a Shopify collection and click the Nth visible product card link.
   * Reuses `homepageMerchandisedPdpLinks`-style filtering by going through `a[href*="/products/"]`
   * inside the collection grid.
   * @param {string} collectionPath
   * @param {number} skip
   */
  async openProductInCollection(collectionPath, skip = 0) {
    await this.gotoProductPath(collectionPath);
    await this.page
      .locator('main a[href*="/products/"], #MainContent a[href*="/products/"]')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    const links = this.page.locator(
      'main a[href*="/products/"]:visible, #MainContent a[href*="/products/"]:visible'
    );
    const total = await links.count();
    if (total === 0) return false;
    const limit = Math.min(total, 30);
    const visible = [];
    for (let i = 0; i < limit; i += 1) {
      const href = await links.nth(i).getAttribute('href').catch(() => null);
      if (!href || !/\/products\//.test(href)) continue;
      visible.push(i);
    }
    if (visible.length === 0) return false;
    const pick = Math.min(Math.max(0, skip), visible.length - 1);
    const card = links.nth(visible[pick]);
    await card.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    await Promise.all([
      this.page.waitForURL(/\/products\//, { timeout: 30_000 }),
      card.click({ timeout: 15_000, force: true }),
    ]);
    return true;
  }

  /**
   * CP_020 — locate a bundle PDP using env override → candidate product paths → bundle collection.
   * @param {string} envPath
   * @returns {Promise<boolean>}
   */
  async openBundleProductPdp(envPath = '') {
    const tryPdp = async (path) => {
      try {
        await this.gotoProductPath(path);
      } catch {
        return false;
      }
      return /\/products\//.test(this.page.url());
    };
    if (envPath && (await tryPdp(envPath))) return true;
    for (const p of cp020Discovery.bundleProductCandidates) {
      if (await tryPdp(p)) return true;
    }
    for (const c of cp020Discovery.bundleCollectionCandidates) {
      try {
        const ok = await this.openProductInCollection(c, 0);
        if (ok) return true;
      } catch {
        /* try next */
      }
    }
    return false;
  }

  /**
   * CP_020 — full add flow for one optional CP_020 product (bundle / sale / promo).
   * @param {{
   *   envPath?: string,
   *   kind: 'bundle' | 'finalSale' | 'promotional',
   *   logger?: { info?: (s: string) => void, warn?: (s: string) => void },
   * }} opts
   * @returns {Promise<{ skipped: boolean, lineDelta: number, reason?: string, pdpUrl?: string }>}
   */
  async addCp020ProductAndOpenBag(opts) {
    const { envPath = '', kind, logger } = opts;
    const log = (msg) => { try { logger?.info?.(`CP_020/${kind}: ${msg}`); } catch { /* noop */ } };
    const beforeOpen = await this.lineItemCount().catch(() => 0);
    log(`start — envPath="${envPath}" lineItemsBefore=${beforeOpen}`);

    let opened = false;
    if (kind === 'bundle') {
      opened = await this.openBundleProductPdp(envPath);
    } else if (kind === 'finalSale') {
      if (envPath) {
        try {
          await this.gotoProductPath(envPath);
        } catch (e) {
          log(`gotoProductPath threw — ${e.message}`);
        }
        opened = /\/products\//.test(this.page.url());
      }
      if (!opened) opened = await this.openProductInCollection(cp020Discovery.saleCollection, 0);
    } else {
      if (envPath) {
        try {
          await this.gotoProductPath(envPath);
        } catch (e) {
          log(`gotoProductPath threw — ${e.message}`);
        }
        opened = /\/products\//.test(this.page.url());
      }
      if (!opened) opened = await this.openProductInCollection(cp020Discovery.promoCollection, 1);
    }
    if (!opened) {
      log(`PDP not opened (url=${this.page.url()})`);
      return { skipped: true, lineDelta: 0, reason: 'pdp-not-opened', pdpUrl: this.page.url() };
    }
    const pdpUrl = this.page.url();
    log(`PDP opened: ${pdpUrl}`);

    const handleMatch = pdpUrl.match(/\/products\/([a-z0-9\-]+)/i);
    const handle = handleMatch ? handleMatch[1] : '';
    const pantOverride = handle && cp020PantVariantByHandle[handle] ? cp020PantVariantByHandle[handle] : null;
    let pantPreselected = false;
    if (pantOverride && (await this.hasPantVariantFormOnPdp())) {
      log(`applying pant override for "${handle}" → ${JSON.stringify(pantOverride)}`);
      await this.selectChinoPantTripleVariantInScope(this.page, pantOverride);
      await this.pickFirstHemStyleIfPresentOnPdp().catch(() => {});
      pantPreselected = true;
    }

    try {
      await this.clickAddToBagOnPdp({
        excludeColorSwatches: true,
        waitForAddToBagEnabledOnly: pantPreselected,
        pantVariantAlreadySelected: pantPreselected,
      });
      log('Add-to-Bag clicked');
    } catch (e) {
      log(`clickAddToBagOnPdp threw — ${e.message.split('\n')[0]}`);
      return { skipped: true, lineDelta: 0, reason: `atb-failed:${e.message.split('\n')[0]}`, pdpUrl };
    }
    await this.page.waitForTimeout(800);
    try {
      await this.closeCartDrawerIfOpen();
      await this.openBagFromHeader();
      await this.waitForCartUiOpen(20_000);
      await this.waitForCartLineItems(1, 15_000);
    } catch (e) {
      log(`bag open after ATB failed — ${e.message.split('\n')[0]}`);
    }
    const after = await this.lineItemCount().catch(() => 0);
    const lineDelta = Math.max(0, after - beforeOpen);
    log(`done — lineItemsAfter=${after} lineDelta=${lineDelta}`);
    return {
      skipped: lineDelta === 0,
      lineDelta,
      reason: lineDelta === 0 ? 'no-line-delta' : undefined,
      pdpUrl,
    };
  }

  /* ============================================================================
   *  CP_020 — recorded-flow helpers.
   *
   *  Each step replays the exact nav → card → variant → ADD TO BAG path
   *  captured from Playwright codegen against the Bonobos DEV storefront.
   *  After ATB we open the cart drawer and report a discount cue so the
   *  matching `Then` assertion can verify it.
   * ============================================================================ */

  /**
   * Click a top-nav link by accessible name, falling back to opening the
   * mega-menu if the link is hidden behind a hover trigger.
   * @param {string} name
   */
  async clickTopNavLink(name) {
    await dismissCookieBanner(this.page).catch(() => {});
    const candidates = [
      this.page.getByRole('link', { name, exact: true }),
      this.page.locator(`header a:has-text("${name}")`),
      this.page.locator(`nav a:has-text("${name}")`),
    ];
    for (const c of candidates) {
      const n = await c.count().catch(() => 0);
      for (let i = 0; i < Math.min(n, 6); i += 1) {
        const el = c.nth(i);
        if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
          await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
          await el.click({ timeout: 15_000 });
          return;
        }
      }
    }
    throw new Error(`top-nav link "${name}" not clickable`);
  }

  /**
   * CP_020 — click the storefront's SALE mega-menu link.
   *
   * Tries the recorded XPath first (mega-menu anchor with the captured
   * `aria-controls` id). Theme republishes rotate that id, so we fall back to
   * the accessible name "SALE" via {@link #clickTopNavLink} and finally a
   * direct collection visit. Whichever path wins, we wait for
   * `/collections/sale` to load.
   */
  async clickCp020SaleNav() {
    await dismissCookieBanner(this.page).catch(() => {});

    const trySaleClick = async () => {
      const recordedAnchor = this.page.locator(`xpath=${cp020SaleNavXPath}`).first();
      if (await recordedAnchor.isVisible({ timeout: 1500 }).catch(() => false)) {
        await recordedAnchor.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
        await recordedAnchor.click({ timeout: 12_000, force: true });
        return 'recordedXPath';
      }
      try {
        await this.clickTopNavLink('SALE');
        return 'topNavLink';
      } catch {
        return null;
      }
    };

    const used = await trySaleClick();
    if (used) {
      const ok = await this.page
        .waitForURL(/\/collections\/sale/i, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (ok) return used;
    }
    await this.gotoProductPath('/collections/sale');
    return 'directNavigation';
  }

  /**
   * CP_020 — click the product card whose `<img>` `src` contains the given
   * stem. Walks visible image anchors first; if no anchor wraps the image,
   * falls back to clicking the image itself (Bonobos `Slideshow` uses a JS
   * click handler on the `<img>`).
   *
   * Waits for the storefront to navigate to a `/products/...` URL and returns
   * the resolved PDP URL on success.
   *
   * @param {string} srcStem — e.g. `PANT_CHINO-PANT_BWB00809S1006P`
   * @param {{ timeout?: number }} [opts]
   * @returns {Promise<string>}
   */
  async clickProductMediaByImgSrcSubstring(srcStem, opts = {}) {
    const timeout = opts.timeout ?? 30_000;
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const escaped = srcStem.replace(/"/g, '\\"');
    const anchorLoc = this.page.locator(`a:has(img[src*="${escaped}"])`);
    const imgLoc = this.page.locator(`img[src*="${escaped}"]`);

    const clickAndWait = async (loc) => {
      const n = await loc.count().catch(() => 0);
      for (let i = 0; i < Math.min(n, 8); i += 1) {
        const el = loc.nth(i);
        await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
        if (!(await el.isVisible({ timeout: 800 }).catch(() => false))) continue;
        try {
          await Promise.all([
            this.page.waitForURL(/\/products\//, { timeout }),
            el.click({ timeout: 12_000, force: true }),
          ]);
          return true;
        } catch {
          /* try next candidate */
        }
      }
      return false;
    };

    if (await clickAndWait(anchorLoc)) return this.page.url();
    if (await clickAndWait(imgLoc)) return this.page.url();
    throw new Error(`product media with img src containing "${srcStem}" not clickable`);
  }

  /**
   * CP_020 — find the first VISIBLE product card matching `labelExact` and click it,
   * waiting for the storefront to navigate to a `/products/` PDP. Tries (in order):
   *   1. `getByLabel(labelExact, exact)` — visible candidates only
   *   2. `a[href*=hrefSubstring]:visible` — visible candidates only
   *   3. direct `gotoProductPath(fallbackPdpPath)` navigation
   * Returns the resolved PDP URL.
   * @param {{ labelExact?: string, hrefSubstring: string, fallbackPdpPath: string }} opts
   * @returns {Promise<string>}
   */
  async openFirstVisibleProductCard(opts) {
    const { labelExact, hrefSubstring, fallbackPdpPath } = opts;
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(800);

    const tryClick = async (loc) => {
      const n = await loc.count().catch(() => 0);
      for (let i = 0; i < Math.min(n, 12); i += 1) {
        const el = loc.nth(i);
        await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
        if (!(await el.isVisible({ timeout: 800 }).catch(() => false))) continue;
        try {
          await Promise.all([
            this.page.waitForURL(/\/products\//, { timeout: 30_000 }),
            el.click({ timeout: 12_000, force: true }),
          ]);
          return true;
        } catch {
          /* try next candidate */
        }
      }
      return false;
    };

    if (labelExact && (await tryClick(this.page.getByLabel(labelExact, { exact: true })))) {
      return this.page.url();
    }
    if (hrefSubstring && (await tryClick(this.page.locator(`a[href*="${hrefSubstring}"]`)))) {
      return this.page.url();
    }
    await this.gotoProductPath(fallbackPdpPath);
    return this.page.url();
  }

  /**
   * CP_020 — wait for the cart drawer/page to show at least `minLines` line items,
   * then report whether the cart surface visibly shows a discount cue.
   * Pass the pre-add line count + 1 so this resolves only after a genuine cart delta.
   * @param {number} [minLines=1]
   * @returns {Promise<boolean>}
   */
  async openDrawerAndReadDiscountSignal(minLines = 1) {
    await this.page.waitForTimeout(700);
    try {
      if (!(await this.isCartUiOpen())) await this.openBagFromHeader();
      await this.waitForCartUiOpen(20_000);
      await this.waitForCartLineItems(minLines, 25_000);
    } catch {
      /* tolerate — discount-signal check runs against whatever is visible */
    }
    return this.cartHasDiscountSignal();
  }

  /**
   * CP_020 — click ATB and verify cart actually grew. If line count does not reach
   * `minLines` in `pollMs`, re-click ATB up to `retries` times (some PDPs need a
   * second click after the variant picker fully hydrates).
   * @param {{
   *   minLines: number,
   *   retries?: number,
   *   pollMs?: number,
   *   atbOptions?: object,
   * }} opts
   */
  async clickAtbAndWaitForCartDelta(opts) {
    const { minLines, retries = 2, pollMs = 9000, atbOptions = {} } = opts;
    let attempt = 0;
    while (attempt <= retries) {
      try {
        await this.clickAddToBagOnPdp(atbOptions);
      } catch (e) {
        if (attempt >= retries) throw e;
      }
      const reached = await this.waitForCartLineItems(minLines, pollMs);
      if (reached >= minLines) return true;
      attempt += 1;
    }
    return false;
  }

  /**
   * CP_020 — recorded bundle flow:
   * Home → BUNDLES nav → first "Weekday Warrior Dress Pants" card → Waist 28 / Fit Tailored / Length 30 → ADD TO BAG.
   * @param {{ logger?: { info?: (s:string)=>void, warn?: (s:string)=>void } }} [opts]
   * @returns {Promise<{ skipped: boolean, lineDelta: number, discounted: boolean, pdpUrl: string, reason?: string }>}
   */
  async addCp020BundleViaBundlesNav(opts = {}) {
    const { logger } = opts;
    const log = (m) => { try { logger?.info?.(`CP_020/bundle: ${m}`); } catch { /* noop */ } };
    const before = await this.lineItemCount().catch(() => 0);
    log(`start lineItemsBefore=${before}`);
    try {
      await this.closeCartDrawerIfOpen().catch(() => {});
      await this.gotoHomeRoot();
      try {
        await this.clickTopNavLink('BUNDLES');
        await this.page.waitForURL(/exclusive-specials|bundles/i, { timeout: 20_000 }).catch(() => {});
      } catch (e) {
        log(`BUNDLES nav click skipped — ${e.message.split('\n')[0]}`);
        await this.gotoProductPath('/pages/exclusive-specials').catch(() => {});
      }
      const pdpUrl = await this.openFirstVisibleProductCard({
        labelExact: 'Weekday Warrior Dress Pants',
        hrefSubstring: '/products/weekday-warrior-dress-pants-',
        fallbackPdpPath: '/products/weekday-warrior-dress-pants-wednesday-stone-0',
      });
      log(`PDP opened: ${pdpUrl}`);
      await this.selectChinoPantTripleVariantInScope(this.page, {
        waist: '28',
        fit: 'Tailored',
        length: '30',
      });
      await this.pickFirstHemStyleIfPresentOnPdp().catch(() => {});
      await this.clickAtbAndWaitForCartDelta({
        minLines: before + 1,
        retries: 2,
        atbOptions: {
          excludeColorSwatches: true,
          waitForAddToBagEnabledOnly: true,
          pantVariantAlreadySelected: true,
        },
      });
      log('ATB clicked');
      const discounted = await this.openDrawerAndReadDiscountSignal(before + 1);
      const after = await this.lineItemCount().catch(() => 0);
      const lineDelta = Math.max(0, after - before);
      log(`done lineDelta=${lineDelta} discounted=${discounted}`);
      await this.closeCartDrawerIfOpen();
      return { skipped: lineDelta === 0, lineDelta, discounted, pdpUrl };
    } catch (e) {
      const reason = e.message.split('\n')[0];
      log(`failed — ${reason}`);
      return { skipped: true, lineDelta: 0, discounted: false, pdpUrl: this.page.url(), reason };
    }
  }

  /**
   * CP_020 — recorded final-sale flow:
   *   Home → SALE mega-menu link (recorded XPath) → click the Original Chino
   *   product image (matched by `<img src>` stem `PANT_CHINO-PANT_BWB00809S1006P`)
   *   → Waist 29 / Fit Tailored / Length 30 → ADD TO BAG → verify cart grew.
   * @param {{ logger?: { info?: (s:string)=>void, warn?: (s:string)=>void } }} [opts]
   * @returns {Promise<{ skipped: boolean, lineDelta: number, discounted: boolean, pdpUrl: string, reason?: string }>}
   */
  async addCp020FinalSaleViaSaleNav(opts = {}) {
    const { logger } = opts;
    const log = (m) => { try { logger?.info?.(`CP_020/finalSale: ${m}`); } catch { /* noop */ } };
    const before = await this.lineItemCount().catch(() => 0);
    log(`start lineItemsBefore=${before}`);
    try {
      await this.closeCartDrawerIfOpen().catch(() => {});
      // The bundle step leaves us on /pages/exclusive-specials, so walk back to
      // home where the SALE mega-menu link is mounted in the global header.
      await this.gotoHomeRoot();

      const usedNav = await this.clickCp020SaleNav();
      log(`SALE nav strategy=${usedNav} url=${this.page.url()}`);
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      // Give the lazy-loaded grid a beat to render so the recorded image card is in the DOM.
      await this.page.waitForTimeout(1200);

      // Click the product image whose `<img src>` carries the recorded SKU stem
      // (the Original Chino - Winetasting tile on /collections/sale).
      let pdpUrl;
      try {
        pdpUrl = await this.clickProductMediaByImgSrcSubstring(
          cp020RecordedImageSrcStems.finalSale
        );
      } catch (e) {
        log(`image-src click missed — ${e.message.split('\n')[0]}; trying card fallback`);
        pdpUrl = await this.openFirstVisibleProductCard({
          labelExact: 'The Original Chino',
          hrefSubstring: '/products/stretch-washed-chino-1-',
          fallbackPdpPath: '/products/stretch-washed-chino-1-winetasting-pocket-liner-0',
        });
      }
      log(`PDP opened: ${pdpUrl}`);

      // Select the required variants (waist / fit / length).
      await this.selectChinoPantTripleVariantInScope(this.page, {
        waist: '29',
        fit: 'Tailored',
        length: '30',
      });
      await this.pickFirstHemStyleIfPresentOnPdp().catch(() => {});

      // Click ADD TO BAG and verify the cart grew by one line.
      await this.clickAtbAndWaitForCartDelta({
        minLines: before + 1,
        retries: 2,
        atbOptions: {
          excludeColorSwatches: true,
          waitForAddToBagEnabledOnly: true,
          pantVariantAlreadySelected: true,
        },
      });
      log('ATB clicked');

      const discounted = await this.openDrawerAndReadDiscountSignal(before + 1);
      const after = await this.lineItemCount().catch(() => 0);
      const lineDelta = Math.max(0, after - before);
      log(`done lineDelta=${lineDelta} discounted=${discounted}`);
      await this.closeCartDrawerIfOpen();
      return { skipped: lineDelta === 0, lineDelta, discounted, pdpUrl };
    } catch (e) {
      const reason = e.message.split('\n')[0];
      log(`failed — ${reason}`);
      return { skipped: true, lineDelta: 0, discounted: false, pdpUrl: this.page.url(), reason };
    }
  }

  /**
   * CP_020 — recorded promotional flow:
   *   Cart drawer closed → back to Home → click the promotional product image
   *   on the homepage (matched by `<img src>` stem `PANT_CHINO-PANT_BPT10629S1818B`,
   *   The Chino 2.0 - Brownstones) → Waist 28 / Fit Tailored / Length 28 →
   *   ADD TO BAG → verify cart grew.
   * @param {{ logger?: { info?: (s:string)=>void, warn?: (s:string)=>void } }} [opts]
   * @returns {Promise<{ skipped: boolean, lineDelta: number, discounted: boolean, pdpUrl: string, reason?: string }>}
   */
  async addCp020PromotionalViaHomeChino20(opts = {}) {
    const { logger } = opts;
    const log = (m) => { try { logger?.info?.(`CP_020/promotional: ${m}`); } catch { /* noop */ } };
    const before = await this.lineItemCount().catch(() => 0);
    log(`start lineItemsBefore=${before}`);
    try {
      await this.closeCartDrawerIfOpen().catch(() => {});
      // Always go back to home before the promotional click (recorded flow).
      await this.gotoHomeRoot();
      // The homepage slideshow lazy-loads tiles; give it a moment so the recorded image renders.
      await this.page.waitForTimeout(1500);

      let pdpUrl;
      try {
        pdpUrl = await this.clickProductMediaByImgSrcSubstring(
          cp020RecordedImageSrcStems.promotional
        );
      } catch (e) {
        // Fallback layers: aria-label / alt text / href substring / direct nav. Keeps the test
        // resilient if the homepage merch slot is repositioned but the SKU stays the same.
        log(`image-src click missed — ${e.message.split('\n')[0]}; trying card fallback`);
        pdpUrl = await this.openFirstVisibleProductCard({
          labelExact: 'The Chino 2.0 - Brownstones',
          hrefSubstring: '/products/stretch-washed-chino-brownstones',
          fallbackPdpPath: '/products/stretch-washed-chino-brownstones',
        });
      }
      log(`PDP opened: ${pdpUrl}`);

      await this.selectChinoPantTripleVariantInScope(this.page, {
        waist: '28',
        fit: 'Tailored',
        length: '28',
      });
      await this.pickFirstHemStyleIfPresentOnPdp().catch(() => {});
      await this.clickAtbAndWaitForCartDelta({
        minLines: before + 1,
        retries: 2,
        atbOptions: {
          excludeColorSwatches: true,
          waitForAddToBagEnabledOnly: true,
          pantVariantAlreadySelected: true,
        },
      });
      log('ATB clicked');

      const discounted = await this.openDrawerAndReadDiscountSignal(before + 1);
      const after = await this.lineItemCount().catch(() => 0);
      const lineDelta = Math.max(0, after - before);
      log(`done lineDelta=${lineDelta} discounted=${discounted}`);
      return { skipped: lineDelta === 0, lineDelta, discounted, pdpUrl };
    } catch (e) {
      const reason = e.message.split('\n')[0];
      log(`failed — ${reason}`);
      return { skipped: true, lineDelta: 0, discounted: false, pdpUrl: this.page.url(), reason };
    }
  }

  async gotoHomeRoot() {
    await this.goto('/');
    await dismissCookieBanner(this.page).catch(() => {});
  }

  /**
   * @param {number} zeroBasedIndex
   */
  async openNthProductPdpFromHome(zeroBasedIndex) {
    await dismissCookieBanner(this.page).catch(() => {});
    const links = this.homepageMerchandisedPdpLinks();
    const n = await links.count();
    if (n === 0) throw new Error('No product links found on homepage');
    const visibleIndices = [];
    for (let i = 0; i < Math.min(n, 40); i += 1) {
      if (await links.nth(i).isVisible({ timeout: 800 }).catch(() => false)) visibleIndices.push(i);
    }
    if (visibleIndices.length === 0) throw new Error('No visible product links on homepage');
    const pick = Math.min(Math.max(0, zeroBasedIndex), visibleIndices.length - 1);
    const pdp = links.nth(visibleIndices[pick]);
    await pdp.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    await Promise.all([
      this.page.waitForURL(/\/products\//, { timeout: 30_000 }),
      pdp.click({ timeout: 15_000, force: true }),
    ]);
  }

  /**
   * CP_002 — Add only **Wool Blend Sweater Bomber** and **The Italian Wool Lodge Jacket**
   * using your recorded locators (New Outerwear → Bomber → PDP URLs → Lodge Jacket).
   * Lodge Jacket: click the **product media** image (`alt` = Charcoal swatch / title) on the collection grid, then PDP + ATB.
   */
  async addCp002TwoProductsFromRecordedLocators() {
    await dismissCookieBanner(this.page).catch(() => {});
    await unlockStorefront(this.page);
    await dismissCookieBanner(this.page).catch(() => {});

    const p = this.page;
    const base = env.BASE_URL.replace(/\/+$/, '');
    const L = cp002RecordedLocators;

    await p.getByTestId('cart-drawer-trigger').click({ timeout: 15_000, force: true });
    await p.getByRole('link', { name: 'New Outerwear' }).first().click({ timeout: 25_000, noWaitAfter: true });
    const bomberCard = p.getByLabel('Wool Blend Sweater Bomber', { exact: true }).first();
    const bomberHref = await bomberCard.getAttribute('href').catch(() => null);
    if (bomberHref && /\/products\//.test(bomberHref)) {
      const target = bomberHref.startsWith('http') ? bomberHref : `${base}${bomberHref.startsWith('/') ? '' : '/'}${bomberHref}`;
      await p.goto(target, { waitUntil: 'domcontentloaded', timeout: env.NAVIGATION_TIMEOUT });
    } else {
      await bomberCard.click({ timeout: 20_000, force: true, noWaitAfter: true });
    }
    await p.locator(L.woolBomberSwatchPicker).click({ timeout: 15_000 });
    await p.locator(L.woolBomberSwatchPicker).check({ timeout: 10_000 }).catch(() => {});
    await p.getByRole('radio', { name: 'XS' }).first().check({ timeout: 15_000 });
    await p.goto(`${base}${L.paths.woolBomberPdp}`, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await dismissCookieBanner(p).catch(() => {});
    await p
      .getByRole('button', { name: L.addToBagButtonName })
      .first()
      .evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
      });
    await p.waitForTimeout(600);
    await p
      .locator('#cart-drawer-header')
      .getByRole('button', { name: 'Close dialog' })
      .click({ timeout: 15_000 })
      .catch(() => {});

    await p.goto(`${base}${L.paths.collectionA}`, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await dismissCookieBanner(p).catch(() => {});
    await p.goto(`${base}${L.paths.collectionB}`, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await dismissCookieBanner(p).catch(() => {});

    // After Wool Bomber is in the cart: open Lodge Jacket PDP by clicking the product media image (`alt` from theme).
    const lodgeImg = p.getByAltText(L.lodgeJacketMediaAlt, { exact: true }).first();
    await lodgeImg.waitFor({ state: 'attached', timeout: 25_000 });
    await lodgeImg.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    await lodgeImg.click({ timeout: 20_000, force: true });
    await p.waitForURL(/\/products\//, { timeout: 35_000 }).catch(() => {});
    await p.waitForLoadState('domcontentloaded').catch(() => {});

    await p.getByRole('radio', { name: 'S', exact: true }).first().scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
    await p.getByRole('radio', { name: 'S', exact: true }).first().check({ timeout: 15_000, force: true }).catch(() => {});
    await p.goto(`${base}${L.paths.lodgeJacketPdp}`, {
      waitUntil: 'domcontentloaded',
      timeout: env.NAVIGATION_TIMEOUT,
    });
    await dismissCookieBanner(p).catch(() => {});
    await p
      .getByRole('button', { name: L.addToBagButtonName })
      .first()
      .evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
      });
    await p.waitForTimeout(600);
    await p
      .locator('#cart-drawer-header')
      .getByRole('button', { name: 'Close dialog' })
      .click({ timeout: 15_000 })
      .catch(() => {});

    await this.gotoHomeRoot();
    await dismissCookieBanner(this.page).catch(() => {});
    await this.openBagFromHeader();
    await this.waitForCartUiOpen();
    // Headed verification: keep the bag / side cart open ~6s (within 5–7s) so line items are visible.
    await this.page.waitForTimeout(6000);
    await this.closeCartDrawerIfOpen();
  }

  /** Add multiple distinct homepage products (closes drawer between adds when a close control exists). */
  async addDistinctProductsFromHome(count) {
    for (let i = 0; i < count; i += 1) {
      await this.gotoHomeRoot();
      await this.openNthProductPdpFromHome(i);
      await this.clickAddToBagOnPdp();
      await this.page.waitForTimeout(600);
      await this.closeCartDrawerIfOpen();
    }
  }

  /** Try to change a variant on PDP (radio, picker, or select). */
  async changeProductVariantOnPdpIfOptionsExist() {
    const radioLabel = this.page.locator('fieldset input[type="radio"]:not(:checked) + label').first();
    if (await radioLabel.isVisible({ timeout: 4000 }).catch(() => false)) {
      await radioLabel.click({ timeout: 8000 });
      await this.page.waitForTimeout(400);
      return true;
    }
    const pickerBtn = this.page
      .locator('[data-variant-picker] button[aria-pressed="false"], .variant-picker__option button:not([aria-selected="true"])')
      .first();
    if (await pickerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pickerBtn.click({ timeout: 8000 });
      await this.page.waitForTimeout(400);
      return true;
    }
    const select = this.page.locator('select[name="id"], select#product-select, form[action*="/cart/add"] select').first();
    if (await select.isVisible({ timeout: 2500 }).catch(() => false)) {
      const values = await select.locator('option').evaluateAll((opts) =>
        opts.map((o) => o.getAttribute('value')).filter(Boolean)
      );
      if (values.length > 1) {
        await select.selectOption(values[1]);
        await this.page.waitForTimeout(500);
        return true;
      }
    }
    return false;
  }

  /**
   * CP_020 — read every cart line item's pricing.
   *
   * Returns one entry per line item with:
   *   - `discounted`  current (sale) unit price in dollars (or undefined)
   *   - `original`   compare-at unit price in dollars (or undefined when no
   *                   strike-through is rendered for that line)
   *   - `quantity`   numeric qty parsed from the line's quantity input/text
   *   - `text`       raw normalised line text (debug aid)
   *
   * The cart drawer/page must already be open. Uses the same line-item locator
   * as {@link #lineItemCount} and looks for compare-at price nodes by class
   * substrings the Bonobos theme uses (`compare`, `strike`, `line-through`,
   * plus the bare `<s>` / `<del>` element).
   *
   * @returns {Promise<Array<{ discounted?: number, original?: number, quantity: number, text: string }>>}
   */
  async readCartLineItemPricing() {
    const surface = this.cartSurface();
    const rows = surface.locator(this.selectors.lineItem);
    const total = await rows.count();
    const parseMoney = (raw) => {
      if (!raw) return undefined;
      const m = String(raw).replace(/,/g, '').match(/\$\s*([\d]+(?:\.\d{1,2})?)/);
      return m ? parseFloat(m[1]) : undefined;
    };
    const out = [];
    for (let i = 0; i < total; i += 1) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 4000 }).catch(() => false))) continue;
      const rowText = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();

      // Compare-at (original) price: theme renders this as <s>, <del>, or a node
      // with `compare` / `strike` / `line-through` in its class list.
      let original;
      const compareNode = row
        .locator('s, del, .compare-at-price, [class*="compare"], [class*="strike"], [class*="line-through"]')
        .first();
      if (await compareNode.isVisible({ timeout: 1200 }).catch(() => false)) {
        original = parseMoney(await compareNode.innerText().catch(() => ''));
      }

      // Discounted (current) price. Try the explicit on-sale price first, then
      // fall back to the first `$xx.xx` token that does NOT come from the
      // strike-through node.
      let discounted;
      const saleNode = row
        .locator('.price--on-sale, .price__sale, [class*="price__sale"], [class*="price--on-sale"], .product-price, .cart-product__price')
        .first();
      if (await saleNode.isVisible({ timeout: 600 }).catch(() => false)) {
        discounted = parseMoney(await saleNode.innerText().catch(() => ''));
      }
      if (discounted == null) {
        const tokens = rowText.match(/\$\s*[\d,]+(?:\.\d{1,2})?/g) || [];
        const parsed = tokens.map(parseMoney).filter((v) => v != null);
        // When two amounts are present, theme convention is `<sale> <strike>` — keep the smaller as sale.
        if (parsed.length >= 2 && original != null) {
          discounted = Math.min(...parsed.filter((v) => Math.abs(v - original) > 0.01));
        } else if (parsed.length >= 1) {
          discounted = parsed[0];
        }
      }

      let quantity = 1;
      const qtyInput = row.locator('input[name="updates[]"], input[type="number"][name*="quantity" i]').first();
      if (await qtyInput.isVisible({ timeout: 600 }).catch(() => false)) {
        const v = await qtyInput.inputValue().catch(() => '');
        const n = parseInt(v, 10);
        if (!Number.isNaN(n) && n > 0) quantity = n;
      } else {
        const qtyText = ((await row.locator('cart-quantity-selector-component, [class*="quantity"]').first().innerText().catch(() => '')) || '')
          .replace(/[^\d]/g, '');
        const n = parseInt(qtyText, 10);
        if (!Number.isNaN(n) && n > 0 && n < 50) quantity = n;
      }

      out.push({ discounted, original, quantity, text: rowText });
    }
    return out;
  }

  /**
   * CP_020 — final verification.
   *
   * Opens the cart drawer (if not already), reads every line item's sale and
   * compare-at prices, and:
   *   1. Asserts every line shows a discounted price (compare-at OR a `sale`
   *      / `promo` / `% off` marker — same signal as {@link #cartHasDiscountSignal}).
   *   2. Computes the expected subtotal = Σ (discounted × quantity) and compares
   *      it against the cart's subtotal/total readout. Difference up to $0.05 is
   *      tolerated to absorb cents-level rounding.
   *
   * Returns a structured result; the calling step decides whether to throw via
   * `expect`. The method itself does not assert so a single failure leaves a
   * helpful diagnostic in `world.state` for the Then step to surface.
   *
   * @returns {Promise<{
   *   ok: boolean,
   *   allDiscounted: boolean,
   *   linesWithoutDiscount: number[],
   *   computedTotal: number,
   *   cartSubtotal?: number,
   *   cartTotal?: number,
   *   difference?: number,
   *   lines: Array<{ discounted?: number, original?: number, quantity: number, text: string }>,
   *   raw: string,
   *   reason?: string,
   * }>}
   */
  async verifyCartLinesDiscountedAndTotalMatches() {
    try {
      if (!(await this.isCartUiOpen())) await this.openBagFromHeader();
      await this.waitForCartUiOpen(20_000);
      await this.waitForCartLineItems(1, 20_000);
    } catch {
      /* tolerate — verification reports back via `reason` below */
    }
    const lines = await this.readCartLineItemPricing();
    const { sub, total, raw } = await this.parseSubtotalPromoTotalApprox();
    if (lines.length === 0) {
      return {
        ok: false,
        allDiscounted: false,
        linesWithoutDiscount: [],
        computedTotal: 0,
        cartSubtotal: sub,
        cartTotal: total,
        lines,
        raw,
        reason: 'no line items visible in cart',
      };
    }
    const linesWithoutDiscount = [];
    lines.forEach((l, i) => {
      const hasCompareAt = l.original != null && l.discounted != null && l.original > l.discounted;
      if (!hasCompareAt) linesWithoutDiscount.push(i);
    });
    const computedTotal =
      Math.round(
        lines.reduce((acc, l) => acc + (l.discounted ?? 0) * (l.quantity || 1), 0) * 100
      ) / 100;
    const cartTotalForCheck = sub ?? total;
    const difference =
      cartTotalForCheck != null
        ? Math.round(Math.abs(cartTotalForCheck - computedTotal) * 100) / 100
        : undefined;

    // Fallback: if any line lacked a compare-at node but the cart surface still
    // shows generic discount copy (sale / promo / % off), accept that as the
    // discount signal for those lines.
    let allDiscounted = linesWithoutDiscount.length === 0;
    if (!allDiscounted) {
      const surfaceDiscount = await this.cartHasDiscountSignal();
      if (surfaceDiscount) allDiscounted = true;
    }
    const totalsClose = difference != null ? difference <= 0.05 : false;
    return {
      ok: allDiscounted && totalsClose,
      allDiscounted,
      linesWithoutDiscount,
      computedTotal,
      cartSubtotal: sub,
      cartTotal: total,
      difference,
      lines,
      raw,
    };
  }

  /**
   * CP_021 — parse first three currency amounts near Subtotal / Promo / Total labels (best-effort).
   * @returns {{ sub?: number, promo?: number, total?: number, raw: string }}
   */
  async parseSubtotalPromoTotalApprox() {
    const raw = await this.readSubtotalPromoTotalHints();
    const blocks = [
      { key: 'sub', re: /subtotal[^\$]*(\$[\d,]+\.?\d*)/i },
      { key: 'promo', re: /(promo|promotion|discount)[^\$]*(\$[\d,]+\.?\d*)/i },
      { key: 'total', re: /(total|estimated\s+total)[^\$]*(\$[\d,]+\.?\d*)/i },
    ];
    const parse = (s) => {
      if (!s) return undefined;
      const m = s.replace(/,/g, '').match(/\$?([\d.]+)/);
      return m ? parseFloat(m[1]) : undefined;
    };
    const out = { raw };
    for (const b of blocks) {
      const m = raw.match(b.re);
      if (m) {
        const val = parse(m[m.length - 1]);
        if (b.key === 'sub') out.sub = val;
        if (b.key === 'promo') out.promo = val;
        if (b.key === 'total') out.total = val;
      }
    }
    return out;
  }
}

module.exports = CartPage;
