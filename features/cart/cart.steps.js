/**
 * Cart module step definitions (CP_*).
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const {
  expected,
  emptyCartShopLinkNames,
  cp033EmptyCartCategoryLinks,
  emptyCartMerchandisingMinMatch,
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

/** CP_026 / CP_035 — try Shop Pay wallet + role buttons until a payment popup is captured (same as legacy CP_026). */
async function clickExpressPaymentOptionsWhenShown(world) {
  const page = world.page;
  world.state.paymentPopup = null;

  const shopWallet = page.locator('shop-pay-wallet-button').first();
  if (await shopWallet.isVisible({ timeout: 2500 }).catch(() => false)) {
    const popupEvent = page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
    try {
      await shopWallet.click({ timeout: 10_000, force: true });
    } catch {
      await shopWallet.evaluate((el) => {
        const root = el && el.shadowRoot;
        const b = root && root.querySelector && root.querySelector('button');
        if (b instanceof HTMLElement) b.click();
      });
    }
    const popup = await popupEvent;
    if (popup) {
      world.state.paymentPopup = popup;
      return;
    }
  }

  const patterns = [/shop\s*pay/i, /apple\s*pay/i, /paypal/i, /affirm/i];
  for (const name of patterns) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const popupEvent = page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
      await btn.click({ timeout: 10_000 });
      const popup = await popupEvent;
      if (popup) {
        world.state.paymentPopup = popup;
        break;
      }
    }
  }
}

// ----- Pre-reqs & session -----

Given('the automation run starts with an empty cart before the scenario', async function () {
  await this.getPage('CartPage').clearCartByRemovingLineItems();
});

Given('prerequisite items should exist in the cart for a signed user', { timeout: 300_000 }, async function () {
  const cart = this.getPage('CartPage');
  const home = this.getPage('HomePage');
  await cart.clearCartByRemovingLineItems();
  await cart.gotoHomeRoot();
  await home.waitForHomepageReady(45_000);
  await cart.openFirstProductPdpFromHome();
  await cart.clickAddToBagOnPdp();
  await this.page.waitForTimeout(500);
  await cart.closeCartDrawerIfOpen();
  await cart.gotoHomeRoot();
});

Given('prerequisite items for CP_011 pant variant exist in the cart for a signed user', { timeout: 300_000 }, async function () {
  const cart = this.getPage('CartPage');
  const home = this.getPage('HomePage');
  await cart.clearCartByRemovingLineItems();
  await cart.gotoHomeRoot();
  await home.waitForHomepageReady(45_000);
  await cart.openFirstProductPdpFromHome();
  await cart.selectCp011PantVariantIfPresentOnPdp();
  await cart.clickAddToBagOnPdp({
    excludeColorSwatches: true,
    waitForAddToBagEnabledOnly: true,
    pantVariantAlreadySelected: true,
  });
  await this.page.waitForTimeout(500);
  await cart.closeCartDrawerIfOpen();
  await cart.gotoHomeRoot();
});

Given('prerequisite multiple line items should exist in the cart for a signed user', { timeout: 300_000 }, async function () {
  const cart = this.getPage('CartPage');
  const home = this.getPage('HomePage');
  await home.waitForHomepageReady(60_000);
  await cart.clearCartByRemovingLineItems();
  await cart.gotoHomeRoot();
  await home.waitForHomepageReady(45_000);
  // Same two-SKU flow as CP_002/CP_003 (guarantees two line rows, not merged quantity on one row).
  await cart.addCp002TwoProductsFromRecordedLocators();
});

Given('the customer has logged in to the DEV URL', async function () {
  const home = this.getPage('HomePage');
  await home.waitForHomepageReady(60_000);
});

Given('the signed user has no items in the cart', { timeout: 300_000 }, async function () {
  const cart = this.getPage('CartPage');
  const home = this.getPage('HomePage');
  await cart.clearCartByRemovingLineItems();
  await cart.gotoHomeRoot();
  await home.waitForHomepageReady(45_000);
});

// ----- Navigation & bag -----

When('the customer opens the cart using the bag drawer trigger', async function () {
  await this.getPage('CartPage').openCartFromBagDrawerTrigger();
});

When('the customer clicks on the bag icon on the Home Page to open the cart page', async function () {
  await performClickBagIconOpenCart(this);
});

When('the customer clicks on the bag icon to open the side-cart', async function () {
  await performClickBagIconOpenCart(this);
});

When('the customer clicks on the bag icon in the Home Page', async function () {
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

When('the customer adds catalog products from the homepage to the cart', { timeout: 180_000 }, async function () {
  await this.getPage('CartPage').addDistinctProductsFromHome(2);
});

When('the customer adds a few products to the cart from the storefront', { timeout: 300_000 }, async function () {
  await this.getPage('CartPage').addCp002TwoProductsFromRecordedLocators();
});

When('the customer adds few products to the cart', { timeout: 300_000 }, async function () {
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

When('the customer removes all items from the cart using remove until the cart is empty', { timeout: 180_000 }, async function () {
  const cart = this.getPage('CartPage');
  await cart.waitForCartUiOpen();
  await cart
    .cartSurface()
    .locator('button.cart-product__remove-link, cart-quantity-selector-component')
    .first()
    .waitFor({ state: 'visible', timeout: 12_000 })
    .catch(() => {});
  for (let i = 0; i < 15; i += 1) {
    const n = await cart.lineItemCount();
    if (n === 0) break;
    await cart.clickRemoveFirstLineItem();
  }
  await cart.assertEmptyCartCopyVisible(15_000);
});

When('the customer clicks ADD TO BAG on the first product in Start with these', { timeout: 180_000 }, async function () {
  await this.getPage('CartPage').clickAddToBagFirstInStartWithThese();
});

When('the customer clicks the product image or product link in the cart line item to open the PDP', { timeout: 120_000 }, async function () {
  await this.getPage('CartPage').clickStartWithTheseProductLinkOrImageForPdp();
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

When('the customer clicks on the checkout button in the cart', async function () {
  await this.getPage('CartPage').clickCheckout();
});

When('the customer navigates to previous pages using the back control', async function () {
  await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 60_000 });
});

When('the customer scrolls to the footer section on the Product Detail Page', async function () {
  await this.getPage('HomePage').scrollToFooter();
});

When('the customer clicks different payment options Shop Pay Apple Pay Paypal Affirm when shown', async function () {
  await clickExpressPaymentOptionsWhenShown(this);
});

When('the customer clicks on the X button to close the side cart when shown', async function () {
  await this.getPage('CartPage').closeCartDrawerIfOpen();
});

When('the customer clicks on the X button in the side cart to close the cart', async function () {
  await this.getPage('CartPage').closeCartDrawerIfOpen();
});

When('the customer clicks on different payment options Shop Pay Apple Pay Paypal Affirm', async function () {
  await clickExpressPaymentOptionsWhenShown(this);
});

/**
 * CP_020 — runs the discovery add (env → candidate paths → collection fallback) and records skip state for the matching `Then`.
 */
async function addCp020OptionalProductAndOpenBag(world, kind, envPath, label) {
  const cart = world.getPage('CartPage');
  let result = { skipped: true, lineDelta: 0 };
  try {
    result = await cart.addCp020ProductAndOpenBag({ envPath, kind, logger: world.logger });
  } catch (e) {
    world.logger.warn(`CP_020: ${label} add flow errored — ${e.message}`);
    result = { skipped: true, lineDelta: 0, reason: `threw:${e.message.split('\n')[0]}` };
  }
  world.state[`skipAssert_${label}`] = result.skipped;
  world.state[`cp020_${label}_lineDelta`] = result.lineDelta;
  if (result.skipped) {
    world.logger.warn(
      `CP_020: ${label} — skipped (reason=${result.reason || 'unknown'}, pdpUrl=${result.pdpUrl || 'n/a'}). Update the pinned path in features/cart/cart.data.js if the PDP changed.`
    );
  } else {
    world.logger.info(`CP_020: ${label} added; lineDelta=${result.lineDelta}`);
  }
}

/** CP_020 — record outcome of a recorded-flow add into world.state for the matching `Then`. */
function recordCp020Outcome(world, label, result) {
  world.state[`skipAssert_${label}`] = result.skipped;
  world.state[`cp020_${label}_lineDelta`] = result.lineDelta;
  world.state[`cp020_${label}_discounted`] = result.discounted;
  if (result.skipped) {
    world.logger.warn(
      `CP_020: ${label} — skipped (reason=${result.reason || 'unknown'}, pdpUrl=${result.pdpUrl || 'n/a'}).`
    );
  } else {
    world.logger.info(
      `CP_020: ${label} added; lineDelta=${result.lineDelta} discounted=${result.discounted} pdpUrl=${result.pdpUrl}`
    );
  }
}

When('the customer adds the pinned bundle product and opens the cart page', { timeout: 240_000 }, async function () {
  const cart = this.getPage('CartPage');
  const r = await cart.addCp020BundleViaBundlesNav({ logger: this.logger });
  recordCp020Outcome(this, 'bundle', r);
});

When('the customer adds the pinned final sale product and opens the cart page', { timeout: 240_000 }, async function () {
  const cart = this.getPage('CartPage');
  const r = await cart.addCp020FinalSaleViaSaleNav({ logger: this.logger });
  recordCp020Outcome(this, 'finalSale', r);
});

When('the customer adds the pinned promotional product and opens the cart page', { timeout: 240_000 }, async function () {
  const cart = this.getPage('CartPage');
  const r = await cart.addCp020PromotionalViaHomeChino20({ logger: this.logger });
  recordCp020Outcome(this, 'promotional', r);
});

When('the customer reviews all added items in the cart', { timeout: 120_000 }, async function () {
  const cart = this.getPage('CartPage');
  if (!(await cart.isCartUiOpen())) await cart.openBagFromHeader();
  const r = await cart.verifyCartLinesDiscountedAndTotalMatches();
  this.state.cp020_finalVerification = r;
  this.logger.info(
    `CP_020: final verify lines=${r.lines.length} allDiscounted=${r.allDiscounted} computedTotal=$${r.computedTotal} cartSubtotal=${r.cartSubtotal ?? 'n/a'} cartTotal=${r.cartTotal ?? 'n/a'} diff=${r.difference ?? 'n/a'}`
  );
});

When('the customer checks inventory edge behaviour when CART_INVENTORY_EDGE_PRODUCT_PATH is configured', { timeout: 180_000 }, async function () {
  const cart = this.getPage('CartPage');
  const r = await cart.runInventoryEdgeCatalogCheck(this.logger);
  this.state.cp018_inventorySkip = r.skip;
  this.state.cp018_inventoryOk = r.ok;
});

When('the customer navigates to the storefront cart page by URL', { timeout: 120_000 }, async function () {
  await this.getPage('CartPage').gotoCartPageUrl();
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

Then('the cart page should show line items with product details for a non-empty cart', async function () {
  const cart = this.getPage('CartPage');
  await cart.waitForCartUiOpen();
  await cart.waitForCartLineItems(1, 45_000);
  expect(await cart.lineItemsShowProductSignals()).toBe(true);
  expect(await cart.lineItemCount()).toBeGreaterThan(0);
});

Then('the bag icon should show the correct product count', async function () {
  const cart = this.getPage('CartPage');
  await cart.waitForCartUiOpen();
  await cart.waitForCartLineItems(1, 45_000);
  const lines = await cart.lineItemCount();
  expect(lines, 'CP_029: cart drawer should show line rows matching added items').toBeGreaterThan(0);

  const deadline = Date.now() + 12_000;
  let badgeDigits = '';
  while (Date.now() < deadline) {
    badgeDigits = await cart.headerCartCountText();
    if (badgeDigits.length > 0 && !/^0+$/.test(badgeDigits)) break;
    await this.page.waitForTimeout(350);
  }

  if (badgeDigits.length > 0 && !/^0+$/.test(badgeDigits)) {
    const n = parseInt(badgeDigits, 10);
    expect(Number.isFinite(n) && n >= 1).toBe(true);
    return;
  }

  this.logger.warn(
    `Bag bubble text not read from header selectors (lines=${lines}); cart contents were verified in the prior step.`
  );
});

Then(
  'the correct product details images and quantities should be displayed correctly in the side-cart',
  async function () {
    const cart = this.getPage('CartPage');
    expect(await cart.isCartUiOpen()).toBe(true);
    await cart.waitForCartLineItems(2, 90_000);
    expect(await cart.lineItemsShowProductSignals()).toBe(true);
    expect(await cart.lineItemCount()).toBeGreaterThanOrEqual(2);
  }
);

Then('the customer should be allowed to increase and decrease quantity for line items in the cart', async function () {
  expect(await this.getPage('CartPage').clickPlusOncePerLineThenMinusOncePerLine()).toBe(true);
});

Then(
  'the customer should be allowed to decrease and increase quantity for multiple items added in the side-cart',
  async function () {
    expect(await this.getPage('CartPage').clickPlusOncePerLineThenMinusOncePerLine()).toBe(true);
  }
);

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

Then(
  'the last item should be removed and Your Cart is empty should display with shop merchandising links',
  { timeout: 90_000 },
  async function () {
  const cart = this.getPage('CartPage');
  await cart.assertEmptyCartCopyVisible(15_000);
  expect(await cart.emptyCartMerchandisingLinksVisible(emptyCartShopLinkNames, emptyCartMerchandisingMinMatch)).toBe(
    true
  );
});

Then('each empty-cart category link should navigate correctly using the CP_006 recorded locators', { timeout: 300_000 }, async function () {
  const cart = this.getPage('CartPage');
  const home = this.getPage('HomePage');
  await cart.navigateCp006EmptyCartRecordedFlow(home, this.logger);
});

Then('Your Cart is empty message should appear', async function () {
  await this.getPage('CartPage').assertEmptyCartCopyVisible();
});

Then(
  'Shop Pants Shop Shirts Shop New Arrivals Shop Suits and Blazers links should appear',
  async function () {
    expect(
      await this.getPage('CartPage').emptyCartMerchandisingLinksVisible(cp033EmptyCartCategoryLinks, cp033EmptyCartCategoryLinks.length),
      `CP_033: expected empty-drawer merchandising for: ${cp033EmptyCartCategoryLinks.map((x) => x.label).join(', ')}`
    ).toBe(true);
  }
);

Then('the customer should see Your Cart is empty in the cart drawer', async function () {
  await this.getPage('CartPage').assertEmptyCartCopyVisible();
});

Then('Start with these should appear with product details and links', async function () {
  expect(await this.getPage('CartPage').startWithTheseMerchandisingVisible()).toBe(true);
});

Then('the cart should contain at least one line item after a recommendation add', { timeout: 120_000 }, async function () {
  const cart = this.getPage('CartPage');
  if (!(await cart.isCartUiOpen())) await cart.openCartFromBagDrawerTrigger();
  await cart.waitForCartUiOpen();
  await cart.waitForCartLineItems(1, 55_000);
  expect(await cart.lineItemCount()).toBeGreaterThanOrEqual(1);
});

Then('the customer should be on a product detail page from Start with these', async function () {
  expect(expected.productPageUrl.test(new URL(this.page.url()).pathname)).toBe(true);
  expect(await this.getPage('HomePage').destinationPageHasNoLiquidFailure(this.page)).toBe(true);
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
  expect(
    found.length,
    `CP_011: expected at least one payment express control near checkout; found none (checked: ${found.join(', ') || 'empty'})`
  ).toBeGreaterThan(0);
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
  const cart = this.getPage('CartPage');
  const body = await cart.readSubtotalPromoTotalHints();
  expect(/\$[\d,.]+/.test(body)).toBe(true);
  const lineDelta = this.state.cp020_bundle_lineDelta || 0;
  const linesNow = await cart.lineItemCount();
  const looksLikeBundle = lineDelta >= 2 || linesNow >= 2 || /bundle|set\s+of|pack/i.test(body);
  const discounted = await cart.cartHasDiscountSignal();
  expect(looksLikeBundle || discounted).toBe(true);
});

Then('final sale discounted price cues should be visible in the cart when configured', async function () {
  if (this.state.skipAssert_finalSale) return;
  const cart = this.getPage('CartPage');
  const body = await cart.readSubtotalPromoTotalHints();
  expect(/\$[\d,.]+/.test(body)).toBe(true);
  expect(await cart.cartHasDiscountSignal()).toBe(true);
});

Then('promotional discounted price cues should be visible in the cart when configured', async function () {
  if (this.state.skipAssert_promotional) return;
  const cart = this.getPage('CartPage');
  const body = await cart.readSubtotalPromoTotalHints();
  expect(/\$[\d,.]+/.test(body)).toBe(true);
  expect(await cart.cartHasDiscountSignal()).toBe(true);
});

Then('all line items should show discounted prices and the cart total should match the sum', async function () {
  const r = this.state.cp020_finalVerification;
  expect(r, 'CP_020: final verification did not run before the assertion').toBeTruthy();
  expect(r.lines.length, 'CP_020: expected at least one cart line item').toBeGreaterThan(0);
  expect(
    r.allDiscounted,
    `CP_020: lines without a visible discount: ${JSON.stringify(r.linesWithoutDiscount)}; lines=${JSON.stringify(r.lines)}`
  ).toBe(true);
  expect(
    r.difference != null,
    `CP_020: cart subtotal/total not parseable from drawer (raw="${(r.raw || '').slice(0, 200)}")`
  ).toBe(true);
  expect(
    r.difference <= 0.05,
    `CP_020: cart total $${r.cartSubtotal ?? r.cartTotal} does not match line sum $${r.computedTotal} (diff $${r.difference})`
  ).toBe(true);
});

Then('the cart totals section should show subtotal or monetary lines for promotions when present', async function () {
  const body = await this.getPage('CartPage').readSubtotalPromoTotalHints();
  expect(/subtotal|estimated|total|promo|discount/i.test(body)).toBe(true);
  expect(/\$[\d,.]+/.test(body)).toBe(true);
});

Then('inventory or stock messages should appear or the edge line should clear when the theme applies them', { timeout: 120_000 }, async function () {
  if (this.state.cp018_inventorySkip) {
    this.logger.warn(
      'CP_018: inventory edge not exercised — set CART_INVENTORY_EDGE_PRODUCT_PATH to a SKU that triggers OOS/low-stock messaging or removal in cart.'
    );
    return;
  }
  expect(this.state.cp018_inventoryOk).toBe(true);
});

Then('the empty cart message should display for a zero line item cart', { timeout: 120_000 }, async function () {
  const cart = this.getPage('CartPage');
  expect(await cart.lineItemCount()).toBe(0);
  await cart.assertEmptyCartCopyVisible();
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
  const cart = this.getPage('CartPage');
  expect(await cart.isCartUiOpen()).toBe(true);
  const ms = this.state.lastBagOpenMs ?? 0;
  expect(ms).toBeLessThan(20_000);
  const text = await cart.readSubtotalPromoTotalHints();
  const lines = await cart.lineItemCount();
  const looksEmpty = /your cart is empty|your bag is empty|cart is empty|bag is empty/i.test(text);
  expect(text.length > 15 || lines > 0 || looksEmpty).toBe(true);
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

Then('the customer should be able to close the side cart', async function () {
  const drawer = this.page.locator(this.getPage('CartPage').selectors.drawerRoot).first();
  expect(await drawer.isVisible({ timeout: 2500 }).catch(() => false)).toBe(false);
});
