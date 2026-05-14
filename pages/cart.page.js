/**
 * Cart drawer / `/cart` page — CP_* automation helpers.
 *
 * Selectors tolerate Shopify theme variants (drawer vs full cart).
 */

const BasePage = require('./base.page');
const env = require('../config/env');
const { cp002RecordedLocators, cp005RecordedLocators } = require('../features/cart/cart.data');
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
      giftNoteToggle:
        'button:has-text("Gift"), summary:has-text("Gift"), [aria-controls*="gift"], button:has-text("+")',
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
    const surface = this.cartSurface();
    const rows = surface.locator(this.selectors.lineItem);
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const n = await rows.count();
      if (n >= min) return n;
      await this.page.waitForTimeout(400);
    }
    return rows.count();
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
    return this.page
      .locator(
        [
          'main a[href*="/products/"]:not(.hotspot-dialog__product-link):not(.hotspot-dialog__product-image-link)',
          '#MainContent a[href*="/products/"]:not(.hotspot-dialog__product-link):not(.hotspot-dialog__product-image-link)',
        ].join(', ')
      )
      .filter({ hasNot: this.page.locator('[href*="cdn.shopify"]') });
  }

  /**
   * From homepage (already unlocked), open the first visible merchandised PDP link.
   */
  async openFirstProductPdpFromHome() {
    await dismissCookieBanner(this.page).catch(() => {});
    const pdp = this.homepageMerchandisedPdpLinks().first();
    await pdp.waitFor({ state: 'visible', timeout: 25_000 });
    await Promise.all([
      this.page.waitForURL(/\/products\//, { timeout: 30_000 }),
      pdp.click({ timeout: 15_000 }),
    ]);
  }

  async clickAddToBagOnPdp() {
    const atb = this.page.getByRole('button', { name: /add\s+to\s+bag/i }).first();
    await atb.waitFor({ state: 'visible', timeout: 20_000 });
    await atb.click({ timeout: 15_000 });
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

  async assertEmptyCartCopyVisible() {
    const empty = this.page.getByText(/your cart is empty|cart is empty|no items in your cart/i);
    await empty.first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  async emptyCartMerchandisingLinksVisible(names) {
    for (const { pattern } of names) {
      const link = this.page.getByRole('link', { name: pattern }).first();
      if (!(await link.isVisible({ timeout: 8000 }).catch(() => false))) {
        return false;
      }
    }
    return true;
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
      await next.click({ timeout: 8000 });
      await this.page.waitForTimeout(400);
      return true;
    }
    return false;
  }

  async clickAddToBagOnFirstMerchCardInDrawer() {
    const root = this.page.locator(this.selectors.drawerRoot).first();
    const scope = (await root.isVisible().catch(() => false)) ? root : this.page;
    const btn = scope.getByRole('button', { name: /add\s+to\s+bag/i }).first();
    await btn.waitFor({ state: 'visible', timeout: 12_000 });
    await btn.click({ timeout: 10_000 });
    await this.page.waitForTimeout(600);
  }

  async openFirstMerchProductImageInDrawer() {
    const root = this.page.locator(this.selectors.drawerRoot).first();
    const scope = (await root.isVisible().catch(() => false)) ? root : this.page;
    const imgLink = scope.locator('a[href*="/products/"]').filter({ has: scope.locator('img') }).first();
    await imgLink.waitFor({ state: 'visible', timeout: 12_000 });
    await Promise.all([
      this.page.waitForURL(/\/products\//, { timeout: 25_000 }),
      imgLink.click({ timeout: 12_000 }),
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
      this.page.locator('[data-testid="standalone-add-to-cart"]').first(),
      this.page.locator('button.add-to-cart-button[type="submit"][name="add"]').first(),
      this.page.locator('button[id*="ProductSubmitButton"][id*="add-to-cart"], button[id*="add-to-cart"][type="submit"]').first(),
      this.page.locator('button[ref="addToCartButton"]').first(),
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
    const surface = this.cartSurface();
    const preferred = surface.locator('button.cart-product__remove-link').first();
    const fallback = surface.locator(this.selectors.removeLine).first();
    const remove = (await preferred.isVisible({ timeout: 5000 }).catch(() => false)) ? preferred : fallback;
    await remove.waitFor({ state: 'visible', timeout: 15_000 });
    await remove.scrollIntoViewIfNeeded({ timeout: 12_000 }).catch(() => {});
    try {
      await remove.click({ timeout: 12_000, force: true });
    } catch {
      await remove.evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
      });
    }
    await this.page.waitForTimeout(900);
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

  async headerCartCountText() {
    const badge = this.page.locator(
      '[class*="cart-count"], .cart-count-bubble, [data-cart-count], .header__cart-count'
    );
    const t = ((await badge.first().textContent()) || '').trim();
    return t;
  }

  async lineItemsShowProductSignals() {
    const lines = await this.lineItemCount();
    if (lines === 0) return false;
    // Prefer the same `.cart-item` nodes used for counts (avoids wrong `cartSurface()` / dialog).
    const firstLi = this.cartSurface().locator(this.selectors.lineItem).first();
    if (!(await firstLi.isVisible({ timeout: 12_000 }).catch(() => false))) return false;
    const priceLike = /\$[\d,]+(?:\.\d{2})?/;
    const hasImg = await firstLi.locator('img').first().isVisible({ timeout: 6000 }).catch(() => false);
    const hasPrice = await firstLi.getByText(priceLike).first().isVisible({ timeout: 6000 }).catch(() => false);
    if (hasImg || hasPrice) return true;
    const surface = this.cartSurface();
    const surfImg = await surface.locator('img').first().isVisible({ timeout: 4000 }).catch(() => false);
    const surfPrice = await surface.getByText(priceLike).first().isVisible({ timeout: 4000 }).catch(() => false);
    return surfImg || surfPrice;
  }

  async expandGiftNoteIfPresent() {
    const toggle = this.page.locator(this.selectors.giftNoteToggle).first();
    if (await toggle.isVisible({ timeout: 4000 }).catch(() => false)) {
      await toggle.click({ timeout: 8000 });
      await this.page.waitForTimeout(400);
      return true;
    }
    return false;
  }

  async paymentExpressButtonsVisible() {
    const patterns = [/shop\s*pay/i, /apple\s*pay/i, /paypal/i, /affirm/i];
    const found = [];
    for (const name of patterns) {
      const b = this.page.getByRole('button', { name }).first();
      if (await b.isVisible({ timeout: 2500 }).catch(() => false)) {
        found.push(String(name));
      }
    }
    return found;
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

  async readSubtotalPromoTotalHints() {
    const surface = this.cartSurface();
    const text = ((await surface.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    return text;
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
    const idx = Math.min(Math.max(0, zeroBasedIndex), n - 1);
    const pdp = links.nth(idx);
    await pdp.waitFor({ state: 'visible', timeout: 25_000 });
    await Promise.all([
      this.page.waitForURL(/\/products\//, { timeout: 30_000 }),
      pdp.click({ timeout: 15_000 }),
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
    await p.getByLabel('Wool Blend Sweater Bomber', { exact: true }).click({ timeout: 20_000 });
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
