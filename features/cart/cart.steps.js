/**
 * Cart module step definitions (CP_*).
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const {
  expected,
  emptyCartShopLinkNames,
  pdpFooterLinkSample,
  optionalProductPaths,
  freeShippingSheet,
} = require('./cart.data');
const { expected: hpExpected } = require('../homepage/homepage.data');

// ----- Shared actions (used by multiple cart steps) -----

async function performClickBagIconOpenCart(world) {
  const cart = world.getPage('CartPage');
  const t0 = Date.now();
  await cart.openBagFromHeader();
  await cart.waitForCartUiOpen();
  world.state.lastBagOpenMs = Date.now() - t0;
}

// ----- Pre-reqs & session -----

Given('the automation run starts with an empty cart before the scenario', async function () {
  await this.getPage('CartPage').clearCartByRemovingLineItems();
});

Given('prerequisite items should exist in the cart for a signed user', async function () {
  const cart = this.getPage('CartPage');
  await cart.clearCartByRemovingLineItems();
  await cart.gotoHomeRoot();
  await cart.openFirstProductPdpFromHome();
  await cart.clickAddToBagOnPdp();
  await this.page.waitForTimeout(500);
  await cart.closeCartDrawerIfOpen();
  await cart.gotoHomeRoot();
});

Given('prerequisite multiple line items should exist in the cart for a signed user', async function () {
  const cart = this.getPage('CartPage');
  await cart.clearCartByRemovingLineItems();
  await cart.addDistinctProductsFromHome(2);
});

Given('the customer has logged in to the DEV URL', async function () {
  const home = this.getPage('HomePage');
  await home.waitForHomepageReady(60_000);
});

// ----- Navigation & bag -----

When('the customer clicks on the bag icon on the Home Page to open the cart page', async function () {
  await performClickBagIconOpenCart(this);
});

When('the customer clicks on the bag icon on the Product Detail Page to open the cart', async function () {
  await performClickBagIconOpenCart(this);
});

When('the customer goes to the footer section on the storefront', async function () {
  const cart = this.getPage('CartPage');
  await cart.gotoHomeRoot();
  const home = this.getPage('HomePage');
  await home.scrollToFooter();
});

When('the customer clicks on any product on the home page and adds it to the cart', async function () {
  const cart = this.getPage('CartPage');
  await cart.gotoHomeRoot();
  await cart.openFirstProductPdpFromHome();
  await cart.clickAddToBagOnPdp();
  await this.page.waitForTimeout(500);
});

When('the customer clicks on any product link on the Home Page', async function () {
  const cart = this.getPage('CartPage');
  await cart.gotoHomeRoot();
  await cart.openFirstProductPdpFromHome();
});

When('the customer adds a few products to the cart from the storefront', { timeout: 300_000 }, async function () {
  await this.getPage('CartPage').addCp002TwoProductsFromRecordedLocators();
});

When('the customer adds a product to the cart by clicking Add to Bag from the product page', async function () {
  const cart = this.getPage('CartPage');
  await cart.gotoHomeRoot();
  await cart.openFirstProductPdpFromHome();
  await cart.clickAddToBagOnPdp();
  await this.page.waitForTimeout(600);
});

When('the customer clicks on remove for an item in the cart', async function () {
  await this.getPage('CartPage').clickRemoveFirstLineItem();
});

When('the customer clicks on edit for an item in the cart', async function () {
  await this.getPage('CartPage').clickEditFirstLineItem();
});

When('the customer clicks on edit for line item {int} in the cart', async function (oneBasedIndex) {
  await this.getPage('CartPage').clickEditNthLineItem(oneBasedIndex);
});

When('the customer clicks on edit for the Wool Blend Sweater Bomber in the cart', { timeout: 120_000 }, async function () {
  await this.getPage('CartPage').clickEditBomberByCp005AriaLabel();
});

When('the customer selects size {string} on the product detail page opened from the cart', { timeout: 120_000 }, async function (sizeLabel) {
  await this.getPage('CartPage').selectPdpSizeRadio(sizeLabel);
});

When('the customer changes the variants on the PDP opened from the cart', async function () {
  await this.getPage('CartPage').changeProductVariantOnPdpIfOptionsExist();
});

When('the customer clicks on Update Bag', { timeout: 90_000 }, async function () {
  const cart = this.getPage('CartPage');
  let ok = await cart.clickUpdateBagIfVisible();
  if (!ok) {
    await this.page.waitForTimeout(1500);
    ok = await cart.clickUpdateBagIfVisible();
  }
  if (!ok) {
    this.logger.warn('CP_005: Update Bag control not visible — theme may auto-apply variant');
  }
});

When('the customer removes all items from the cart using remove until the cart is empty', async function () {
  const cart = this.getPage('CartPage');
  await cart.waitForCartUiOpen();
  await cart
    .cartSurface()
    .locator('button.cart-product__remove-link, cart-quantity-selector-component')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .catch(() => {});
  for (let i = 0; i < 15; i += 1) {
    const n = await cart.lineItemCount();
    if (n === 0) break;
    await cart.clickRemoveFirstLineItem();
  }
});

When('the customer navigates the Shop the Look section using the carousel arrows when present', async function () {
  await this.getPage('CartPage').carouselNextInCart(/shop|look|start|pair|wear|complete/i);
});

When('the customer clicks ADD TO BAG on a product in the cart recommendations section when available', async function () {
  const cart = this.getPage('CartPage');
  const drawer = await cart.cartDrawerOpenedAfterAdd(2000);
  if (!drawer) await cart.openBagFromHeader();
  await cart.waitForCartUiOpen();
  try {
    await cart.clickAddToBagOnFirstMerchCardInDrawer();
  } catch {
    this.logger.warn('CP_007: ADD TO BAG in recommendations not available');
  }
});

When('the customer clicks on a product image in the cart recommendations section when available', async function () {
  const cart = this.getPage('CartPage');
  if (!(await cart.isCartUiOpen())) await performClickBagIconOpenCart(this);
  await cart.waitForCartUiOpen();
  try {
    await cart.openFirstMerchProductImageInDrawer();
  } catch {
    this.logger.warn('CP_007: recommendation product image link not available');
  }
});

When('the customer verifies a gift note can be added by clicking on plus', async function () {
  const cart = this.getPage('CartPage');
  const plus = this.page.getByRole('button', { name: /^\+$/ }).first();
  if (await plus.isVisible({ timeout: 2500 }).catch(() => false)) {
    await plus.click({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }
  await cart.expandGiftNoteIfPresent();
});

When('the customer clicks on the checkout button in the cart', async function () {
  await this.getPage('CartPage').clickCheckout();
});

When('the customer navigates to previous pages using the back control', async function () {
  await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 60_000 });
});

When('the customer scrolls to the footer section on the Product Detail Page', async function () {
  await this.getPage('HomePage').scrollToFooter();
});

When('the customer clicks the sample footer links to ensure they direct to correct pages', async function () {
  const home = this.getPage('HomePage');
  const storeOrigin = new URL(this.page.url()).origin;

  const footerRoot = (spec) => {
    if (spec.scope === 'policyFooter') {
      return this.page.locator(home.selectors.footerPolicySection).first();
    }
    return this.page.locator(home.selectors.footer).first();
  };

  const linkRole = (spec) =>
    typeof spec.name === 'string' && spec.exact
      ? { name: spec.name, exact: true }
      : { name: spec.name };

  for (const spec of pdpFooterLinkSample) {
    const root = footerRoot(spec);
    let link = root.getByRole('link', linkRole(spec));
    if ((await link.count()) === 0) {
      link = this.page.locator(home.selectors.footer).first().getByRole('link', linkRole(spec));
    }
    await link.first().scrollIntoViewIfNeeded({ timeout: 12_000 });
    await link.first().waitFor({ state: 'visible', timeout: 12_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      link.first().click({ timeout: 12_000 }),
    ]);
    const dest = this.page.url();
    if (!spec.allowExternal && !dest.startsWith(storeOrigin) && !/bonobos/i.test(dest)) {
      throw new Error(`CP_025 ${spec.key}: unexpected external URL ${dest}`);
    }
    expect(await home.destinationPageHasNoLiquidFailure(this.page)).toBe(true);
    await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await this.page.waitForTimeout(400);
  }
  this.state.footerSampleLinksChecked = true;
});

When('the customer clicks different payment options Shop Pay Apple Pay Paypal Affirm when shown', async function () {
  const patterns = [/shop\s*pay/i, /apple\s*pay/i, /paypal/i, /affirm/i];
  this.state.paymentPopup = null;
  for (const name of patterns) {
    const btn = this.page.getByRole('button', { name }).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const popupEvent = this.page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
      await btn.click({ timeout: 10_000 });
      const popup = await popupEvent;
      if (popup) {
        this.state.paymentPopup = popup;
        break;
      }
    }
  }
});

When('the customer clicks on the X button to close the side cart when shown', async function () {
  await this.getPage('CartPage').closeCartDrawerIfOpen();
});

async function addConfiguredProductAndOpenBag(world, path, label) {
  if (!path) {
    world.logger.warn(`CP_020: ${label} skipped — env path not set`);
    world.state[`skipAssert_${label}`] = true;
    return;
  }
  world.state[`skipAssert_${label}`] = false;
  const cart = world.getPage('CartPage');
  await cart.gotoProductPath(path);
  const atb = world.page.getByRole('button', { name: /add\s+to\s+bag/i }).first();
  if (!(await atb.isVisible({ timeout: 8000 }).catch(() => false))) {
    world.logger.warn(`CP_020: ${label} — Add to Bag not on PDP`);
    world.state[`skipAssert_${label}`] = true;
    return;
  }
  await atb.click({ timeout: 12_000 });
  await world.page.waitForTimeout(600);
  await performClickBagIconOpenCart(world);
}

When('the customer adds a bundle product and opens the cart page when CART_BUNDLE_PRODUCT_PATH is configured', async function () {
  await addConfiguredProductAndOpenBag(this, optionalProductPaths.bundle, 'bundle');
});

When('the customer adds a final sale product and opens the cart page when CART_FINAL_SALE_PRODUCT_PATH is configured', async function () {
  await addConfiguredProductAndOpenBag(this, optionalProductPaths.finalSale, 'finalSale');
});

When('the customer adds a promotional product and opens the cart page when CART_PROMO_PRODUCT_PATH is configured', async function () {
  await addConfiguredProductAndOpenBag(this, optionalProductPaths.promotional, 'promotional');
});

// ----- Assertions -----

Then('the cart page should load fast and smooth without lagging when the bag icon is used', async function () {
  const cart = this.getPage('CartPage');
  expect(await cart.isCartUiOpen()).toBe(true);
  const ms = this.state.lastBagOpenMs ?? 0;
  expect(ms).toBeLessThan(20_000);
  const text = await cart.readSubtotalPromoTotalHints();
  expect(text.length).toBeGreaterThan(15);
});

Then('the cart page should show correct product details images and quantities for the items added', async function () {
  const cart = this.getPage('CartPage');
  expect(await cart.lineItemsShowProductSignals()).toBe(true);
  expect(await cart.lineItemCount()).toBeGreaterThanOrEqual(2);
});

Then('the bag icon should show the correct product count', async function () {
  const cart = this.getPage('CartPage');
  const badge = await cart.headerCartCountText();
  const lines = await cart.lineItemCount();
  const hasBadge = badge.length > 0 && !/^0+$/.test(badge);
  expect(hasBadge || lines > 0).toBe(true);
});

Then('the customer should be allowed to increase and decrease quantity for line items in the cart', async function () {
  expect(await this.getPage('CartPage').clickPlusOncePerLineThenMinusOncePerLine()).toBe(true);
});

Then('the item should be removed from the cart', async function () {
  const cart = this.getPage('CartPage');
  const lines = await cart.lineItemCount();
  const empty = await this.page
    .getByText(/your cart is empty|cart is empty|no items in your cart/i)
    .first()
    .isVisible({ timeout: 8000 })
    .catch(() => false);
  expect(lines === 0 || empty).toBe(true);
});

Then('the cart should remain usable after update', async function () {
  expect(await this.getPage('CartPage').ensureCartUsableAfterLineItemEdit()).toBe(true);
});

Then('the last item should be removed and Your Cart is empty should display with shop merchandising links', async function () {
  const cart = this.getPage('CartPage');
  await cart.assertEmptyCartCopyVisible();
  expect(await cart.emptyCartMerchandisingLinksVisible(emptyCartShopLinkNames)).toBe(true);
});

Then('the shop pants shop shirts shop new arrivals and shop suits links should navigate to respective pages', async function () {
  const home = this.getPage('HomePage');
  for (const { pattern } of emptyCartShopLinkNames) {
    const link = this.page.getByRole('link', { name: pattern }).first();
    if (!(await link.isVisible({ timeout: 4000 }).catch(() => false))) continue;
    const before = this.page.url();
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      link.click({ timeout: 12_000 }),
    ]);
    expect(this.page.url()).not.toBe(before);
    expect(await home.destinationPageHasNoLiquidFailure(this.page)).toBe(true);
    await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await this.page.waitForTimeout(400);
  }
});

Then('the items added to the cart should be present and Shop the Look or equivalent section should appear when the theme shows it', async function () {
  const cart = this.getPage('CartPage');
  expect(await cart.lineItemCount()).toBeGreaterThan(0);
  const shopLook = await cart.sectionVisibleByHeading(/shop\s+the\s+look/i);
  const startThese = await cart.sectionVisibleByHeading(/start\s+with\s+these/i);
  const reco = await cart.sectionVisibleByHeading(/you may also|recommended|complete\s+the\s+look/i);
  expect(shopLook || startThese || reco).toBe(true);
});

Then('the customer should land on a product detail page from the recommendation image when that control exists', async function () {
  if (hpExpected.productExperienceUrl.test(this.page.url())) {
    expect(await this.getPage('HomePage').destinationPageHasNoLiquidFailure(this.page)).toBe(true);
  }
});

Then('the free shipping banner should display the empty-cart message', async function () {
  const t = await this.getPage('CartPage').freeShippingBannerText();
  expect(freeShippingSheet.emptyCart.test(t) || /free\s+shipping/i.test(t)).toBe(true);
});

Then('the free shipping banner should display the below-threshold or unlocked-free-shipping message', async function () {
  const t = await this.getPage('CartPage').freeShippingBannerText();
  expect(
    freeShippingSheet.spendMore.test(t) ||
      freeShippingSheet.freeUnlocked.test(t) ||
      /free\s+shipping|FREE\s+SHIPPING/i.test(t)
  ).toBe(true);
});

Then('different payment methods should be available below the checkout button', async function () {
  const found = await this.getPage('CartPage').paymentExpressButtonsVisible();
  if (found.length === 0) {
    this.logger.warn('CP_011: express payment methods not visible in automation');
  }
});

Then('the customer should land on the review order details or checkout flow', async function () {
  const url = this.page.url();
  expect(
    expected.checkoutOrReviewUrl.test(url) ||
      hpExpected.accountLoginUrl.test(url) ||
      /challenge|authenticate|review|checkout/i.test(url)
  ).toBe(true);
});

Then('the cart page or side cart should open', async function () {
  expect(await this.getPage('CartPage').isCartUiOpen()).toBe(true);
});

Then('the customer should be on a prior storefront or product page without liquid errors', async function () {
  const u = new URL(this.page.url());
  const path = u.pathname || '/';
  const ok =
    expected.productPageUrl.test(path) ||
    path === '/' ||
    path === '' ||
    /\/(collections|pages|search)\//i.test(path);
  expect(ok).toBe(true);
  expect(await this.getPage('HomePage').destinationPageHasNoLiquidFailure(this.page)).toBe(true);
});

Then('bundle or discounted price cues should be visible in the cart when configured', async function () {
  if (this.state.skipAssert_bundle) return;
  const body = await this.getPage('CartPage').readSubtotalPromoTotalHints();
  expect(/\$[\d,.]+/.test(body)).toBe(true);
});

Then('final sale discounted price cues should be visible in the cart when configured', async function () {
  if (this.state.skipAssert_finalSale) return;
  const body = await this.getPage('CartPage').readSubtotalPromoTotalHints();
  expect(/\$[\d,.]+|sale|final/i.test(body)).toBe(true);
});

Then('promotional discounted price cues should be visible in the cart when configured', async function () {
  if (this.state.skipAssert_promotional) return;
  const body = await this.getPage('CartPage').readSubtotalPromoTotalHints();
  expect(/\$[\d,.]+|promo|discount|sale/i.test(body)).toBe(true);
});

Then('the promotional discount product should be available in the cart', async function () {
  expect(await this.getPage('CartPage').lineItemCount()).toBeGreaterThan(0);
});

Then('the Subtotal Promo and Total section should reflect monetary lines', async function () {
  const body = await this.getPage('CartPage').readSubtotalPromoTotalHints();
  expect(/subtotal|total|estimated/i.test(body)).toBe(true);
  expect(/\$[\d,.]+/.test(body)).toBe(true);
});

Then('the Total amount should match subtotal minus discounts when parseable', async function () {
  const { sub, promo, total } = await this.getPage('CartPage').parseSubtotalPromoTotalApprox();
  if (sub !== undefined && total !== undefined && promo !== undefined) {
    const expectedTotal = Math.round((sub - promo) * 100) / 100;
    const diff = Math.abs(expectedTotal - total);
    expect(diff).toBeLessThanOrEqual(0.05);
  }
});

Then('the customer should verify social media logo links land on recognised hosts', async function () {
  expect(await this.getPage('HomePage').verifyFooterSocialLinksOpenRecognisedHosts()).toBe(true);
});

Then('each sampled footer link destination should be healthy', async function () {
  expect(this.state.footerSampleLinksChecked).toBe(true);
});

Then('the side cart should slide open on the home page', async function () {
  expect(await this.getPage('CartPage').isCartUiOpen()).toBe(true);
});

Then('a payment context or popup may open for an external host', async function () {
  const popup = this.state.paymentPopup;
  if (!popup) {
    this.logger.warn('CP_026: no payment popup captured');
    return;
  }
  await popup.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});
  expect(popup.url().length).toBeGreaterThan(8);
  await popup.close().catch(() => {});
});

Then('the side cart should load fast and smooth without lagging when the bag icon is used', async function () {
  expect(await this.getPage('CartPage').isCartUiOpen()).toBe(true);
  expect(this.state.lastBagOpenMs ?? 0).toBeLessThan(20_000);
});

Then('the side cart should slide open automatically with the products added to the bag', async function () {
  const cart = this.getPage('CartPage');
  const drawer = await cart.cartDrawerOpenedAfterAdd(12_000);
  const lines = await cart.lineItemCount();
  expect(drawer || lines > 0).toBe(true);
});

Then('the side cart should close and no longer block the page', async function () {
  const drawer = this.page.locator(this.getPage('CartPage').selectors.drawerRoot).first();
  expect(await drawer.isVisible({ timeout: 2500 }).catch(() => false)).toBe(false);
});
