/**
 * PDP module step definitions (PDP_001..PDP_004).
 *
 * Reuses: `Given the customer has logged in to the DEV URL` (cart.steps.js),
 * storefront Background steps (common.steps.js).
 */

const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const { pdpLoadMaxMs } = require('./pdp.data');

When(
  'the customer navigates to the shirt product detail page for PDP loading verification',
  { timeout: 300_000 },
  async function () {
    const pdp = this.getPage('PdpPage');
    const t0 = Date.now();
    await pdp.gotoHighVariantShirtPdp();
    this.state.pdpLoadMs = Date.now() - t0;
  }
);

When('the customer selects a different shirt color swatch', async function () {
  const pdp = this.getPage('PdpPage');
  this.state.pdpGalleryBefore = await pdp.mainGalleryFingerprint();
  await pdp.clickSecondAvailableColorSwatch();
});

When(
  'the customer selects the first available option for each variant group on the shirt PDP',
  { timeout: 180_000 },
  async function () {
    const n = await this.getPage('PdpPage').selectFirstAvailableOptionPerVariantGroup(24);
    this.state.pdpVariantClicks = n;
    expect(n, 'PDP: expected at least one variant control').toBeGreaterThan(0);
  }
);

When(
  'the customer navigates to the Everyday Linen shirt product detail page',
  { timeout: 300_000 },
  async function () {
    await this.getPage('PdpPage').gotoEverydayLinenOrConfiguredPdp();
  }
);

Then('the shirt product detail page should load without excessive lag', async function () {
  const pdp = this.getPage('PdpPage');
  expect(pdp.isOnProductUrl()).toBe(true);
  const ms = this.state.pdpLoadMs ?? 0;
  expect(ms).toBeGreaterThan(0);
  expect(ms).toBeLessThan(pdpLoadMaxMs);
});

Then('the product detail page should not show a Liquid failure', async function () {
  expect(await this.getPage('HomePage').destinationPageHasNoLiquidFailure(this.page)).toBe(true);
});

Then('the main product image should update for the new shirt color', async function () {
  const after = await this.getPage('PdpPage').mainGalleryFingerprint();
  expect(after.length).toBeGreaterThan(3);
  expect(after).not.toBe(this.state.pdpGalleryBefore);
});

Then(
  'the shirt PDP should expose multiple variant dimensions including six levels when configured',
  async function () {
    const dim = await this.getPage('PdpPage').countVariantDimensionsApprox();
    const rich =
      dim.fieldsets >= 6 ||
      dim.groups >= 6 ||
      dim.approx >= 6 ||
      (dim.fieldsets >= 4 && dim.variantRows >= 12);
    expect(
      rich,
      `PDP_003: expected rich variant UI (fieldsets=${dim.fieldsets}, radiogroups=${dim.groups}, variantRows=${dim.variantRows}, approx=${dim.approx}). Pin PDP_HIGH_VARIANT_SHIRT_PATH to your sheet's master shirt PDP if discovery lands on a simpler SKU.`
    ).toBe(true);
  }
);

Then(
  'ADD TO BAG should be enabled on the shirt PDP when all required variants are chosen',
  { timeout: 120_000 },
  async function () {
    const ok = await this.getPage('PdpPage').waitForAddToBagEnabled(55_000);
    expect(ok, 'ADD TO BAG stayed disabled — complete variant selections or pin a PDP with available SKUs').toBe(true);
  }
);
