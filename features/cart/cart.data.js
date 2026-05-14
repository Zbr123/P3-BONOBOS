/**
 * Cart / side-cart test data (CP_001..CP_028 and related high-priority rows).
 */

const env = require('../../config/env');
const baseUrl = env.BASE_URL.replace(/\/+$/, '');

const expected = {
  /** PDP after opening a merchandised product link. */
  productPageUrl: /\/products\//i,

  /** Shopify checkout / cart review flows. */
  checkoutOrReviewUrl:
    /\/checkouts\/|\/cart\/checkout|shopify\.com\/\d+\/checkouts|\/checkout/i,

  /** CP_006 — empty-cart merchandising (copy may vary slightly on DEV). */
  emptyCartHeading: /your cart is empty/i,

  /** CP_011 — post-checkout account area (fallback if checkout is gated). */
  reviewOrderHeading: /review\s+order|checkout|order details/i,
};

/**
 * CP_006 — named empty-state collection links (accessible names on theme).
 */
const emptyCartShopLinkNames = [
  { label: 'Shop Pants', pattern: /shop\s+pants/i },
  { label: 'Shop Shirts', pattern: /shop\s+shirts/i },
  { label: 'Shop New Arrivals', pattern: /shop\s+new\s+arrivals/i },
  { label: 'Shop Suits & Blazers', pattern: /shop\s+suits/i },
];

/**
 * CP_025 — sample PDP footer links (full HP_038 list is slow; extend here as needed).
 */
const pdpFooterLinkSample = [
  { key: 'Fit Quiz', name: 'Fit Quiz' },
  { key: 'Help', name: 'Help', allowExternal: true },
  { key: 'Privacy Notice', name: 'Privacy Notice', scope: 'policyFooter' },
];

/**
 * CP_020 / CP_021 — optional product URLs or handles (set in `.env` when catalog is known).
 * Example: `CART_BUNDLE_PRODUCT_PATH=/products/chino-bundle`
 */
const optionalProductPaths = {
  bundle: (process.env.CART_BUNDLE_PRODUCT_PATH || '').trim(),
  finalSale: (process.env.CART_FINAL_SALE_PRODUCT_PATH || '').trim(),
  promotional: (process.env.CART_PROMO_PRODUCT_PATH || '').trim(),
};

/** CP_009 — copy patterns for free-shipping banner assertions (theme wording may vary). */
const freeShippingSheet = {
  emptyCart:
    /Free\s+Shipping\s+and\s+Returns\s+in\s+the\s+U\.S\.|free\s+shipping\s+and\s+returns/i,
  spendMore: /Spend\s+.*more.*FREE\s+SHIPPING|spend\s+more/i,
  freeUnlocked: /You've\s+got\s+FREE\s+SHIPPING|You have\s+got\s+FREE\s+SHIPPING/i,
};

/**
 * CP_002 — codegen locators for the two products only (Wool Blend Sweater Bomber + Italian Wool Lodge Jacket).
 * Section ids can change on theme publish — override in `.env` when needed.
 */
const cp002RecordedLocators = {
  productInformationMain:
    (process.env.CP002_PRODUCT_INFO_MAIN || '#ProductInformation-template--26526253973797__main').trim(),

  /** Swatch control on Wool Blend Sweater Bomber PDP (from your recording). */
  woolBomberSwatchPicker:
    (process.env.CP002_WOOL_BOMBER_SWATCH ||
      '#ProductInformation-template--26526253973797__main > div > div:nth-child(2) > .regular-variant-picker-block > .variant-picker > .variant-picker__form > .variant-option.variant-option--buttons.variant-option--swatches > .variant-option__swatch-group > .variant-option__swatch-group-grid > .variant-main-picker > .swatch-wrapper > .swatch'
    ).trim(),

  /** Relative paths (appended to `BASE_URL`) from your recording. */
  paths: {
    woolBomberPdp:
      '/products/wool-blend-sweater-bomber-0?variant=52116950122789&breadcrumb_title=New+Arrivals+-+Outerwear&breadcrumb_url=%2Fcollections%2Fnew-arrivalsouterwear&breadcrumb_current_title=Brown+Black+Micro+Texture&color=Brown+Black+Micro+Texture&outerwear-size=XS&outerwear-fit=One+Fit&option_values=6557185442085%2C6557185605925%2C6557185671461',
    collectionA: '/collections/new-arrivalsouterwear?page=1#135848063eb708e57e70df4fa1c4aa2d',
    collectionB: '/collections/new-arrivalsouterwear?page=1#2f31abeae4daa11f57c3c6fdcd45cecd',
    lodgeJacketPdp:
      '/products/the-italian-wool-lodge-jacket-0?variant=52115119243557&breadcrumb_title=New+Arrivals+-+Outerwear&breadcrumb_url=%2Fcollections%2Fnew-arrivalsouterwear&breadcrumb_current_title=Charcoal&color=Charcoal&outerwear-size=S&outerwear-fit=One+Fit&option_values=6556004286757%2C6556004417829%2C6556004516133',
  },

  /** Bonobos PDP primary CTA — needed after `goto` PDP so line items exist in the cart. */
  addToBagButtonName: 'ADD TO BAG',

  /** PLP / card hero image `alt` — click to open The Italian Wool Lodge Jacket (Charcoal) PDP. */
  lodgeJacketMediaAlt:
    (process.env.CP002_LODGE_JACKET_MEDIA_ALT || 'The Italian Wool Lodge Jacket - Charcoal').trim(),
};

/**
 * CP_005 — Edit control on the Wool Blend Sweater Bomber line (theme exposes full variant in `aria-label`).
 */
const cp005RecordedLocators = {
  editBomberAriaLabel: (
    process.env.CP005_EDIT_BOMBER_ARIA_LABEL ||
    'Edit Wool Blend Sweater Bomber - Brown Black Micro Texture / XS / One Fit'
  ).trim(),
};

module.exports = {
  baseUrl,
  expected,
  emptyCartShopLinkNames,
  pdpFooterLinkSample,
  optionalProductPaths,
  freeShippingSheet,
  cp002RecordedLocators,
  cp005RecordedLocators,
};
