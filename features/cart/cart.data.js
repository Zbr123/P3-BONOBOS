/**
 * Cart / side-cart test data (CP_001..CP_035, CP_018/019 edge paths, and related high-priority rows).
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
 * CP_006 — empty-state merchandising controls (link or button; theme varies).
 * Legacy “Shop …” names plus Bonobos empty-drawer “NEW …” blocks (see empty-cart UI).
 */
const emptyCartShopLinkNames = [
  { label: 'Shop Pants', pattern: /shop\s+pants/i },
  { label: 'Shop Shirts', pattern: /shop\s+shirts/i },
  { label: 'Shop New Arrivals', pattern: /shop\s+new\s+arrivals/i },
  { label: 'Shop Suits & Blazers', pattern: /shop\s+suits/i },
  { label: 'New Pants & Jeans', pattern: /new\s+pants.*jeans/i },
  { label: 'New Shirts / Polos / Henleys', pattern: /new\s+shirts/i },
  { label: 'New Suits / Sweaters row', pattern: /new\s+suits/i },
  { label: 'New Outerwear', pattern: /new\s+outerwear/i },
  { label: 'New Golf', pattern: /new\s+golf/i },
  { label: 'New Accessories', pattern: /new\s+accessories/i },
  { label: 'Recently Restocked', pattern: /recently\s+restocked/i },
];

/** CP_006 — theme may hide carousel links or use buttons; require at least this many matches. */
const emptyCartMerchandisingMinMatch = Math.min(2, emptyCartShopLinkNames.length);

/**
 * CP_033 — spreadsheet “Shop …” labels; theme may surface “New …” blocks instead (same intent).
 */
const cp033EmptyCartCategoryLinks = [
  { label: 'Shop Pants', pattern: /shop\s+pants|new\s+pants/i },
  { label: 'Shop Shirts', pattern: /shop\s+shirts|new\s+shirts/i },
  {
    label: 'Shop New Arrivals',
    pattern: /shop\s+new\s+arrivals|new\s+arrivals/i,
  },
  { label: 'Shop Suits & Blazers', pattern: /shop\s+suits|new\s+suits/i },
];

/**
 * CP_006 — empty-drawer collection links (order matches manual recording; `getByRole('link', { name })`).
 * Accessible names use substring / regex match per Playwright rules.
 */
const cp006EmptyCartNavLinks = [
  { name: 'New Pants & Jeans' },
  { name: /^New Shirts,\s*New T-Shirts/i },
  { name: /^New Suits & Blazers,\s*New/i },
  { name: 'New Outerwear' },
  { name: 'New Golf' },
  { name: 'New Accessories' },
  { name: 'Recently Restocked' },
];

/**
 * Optional PDP paths.
 *
 * CP_018: env-driven (inventory edge is dataset-specific and may not exist on every shop).
 *   `CART_INVENTORY_EDGE_PRODUCT_PATH=/products/some-sku?variant=...`
 *
 * CP_020: hard-pinned to the Bonobos DEV storefront so the scenario has zero env coupling.
 *   - bundle      → Weekday Warrior Dress Pant Bundle (from /pages/exclusive-specials BUNDLES)
 *   - finalSale   → The Original Chino (first card on /collections/sale)
 *   - promotional → Riviera SS Shirt (sale-best-sellers, deep promo discount)
 */
const optionalProductPaths = {
  /** CP_018 — when unset, inventory-edge assertions are skipped (scenario still passes). */
  inventoryEdge: (process.env.CART_INVENTORY_EDGE_PRODUCT_PATH || '').trim(),
  bundle: '/products/weekday-warrior-dress-pants-wednesday-stone-0',
  finalSale: '/products/stretch-washed-chino-1-winetasting-pocket-liner-0',
  promotional: '/products/stretch-riviera-short-sleeve-shirt-aqua-chambray-dobby-dot-0-68241',
};

/**
 * CP_020 — last-resort discovery sources if a pinned PDP ever 404s.
 * The fixed paths above are tried first; these collection walkers run only when the PDP can't be opened.
 */
const cp020Discovery = {
  bundleProductCandidates: [
    '/products/weekday-warrior-dress-pants-wednesday-stone-0',
    '/products/the-chino-bundle',
    '/products/chino-bundle',
  ],
  bundleCollectionCandidates: ['/pages/exclusive-specials', '/collections/bundles'],
  saleCollection: '/collections/sale',
  promoCollection: '/collections/sale-best-sellers',
};

/**
 * CP_020 — pant variant triple per pinned PDP handle.
 *
 * The default `cp011Locators` triple (28 / 28 / Tailored) was chosen for The Chino 2.0.
 * Other pant PDPs may not have the same waist/length/fit combo as an available SKU,
 * so the values below were verified live from `products.json` (waist, fit, length
 * all exist for the same available variant). Applied by `CartPage.addCp020ProductAndOpenBag`
 * before clicking Add to Bag.
 */
const cp020PantVariantByHandle = {
  // Bundle pick — Weekday Warrior Dress Pants — discounted variant (waist=28, fit=Tailored, length=30).
  'weekday-warrior-dress-pants-wednesday-stone-0': { waist: '28', fit: 'Tailored', length: '30' },
  // Final sale pick — The Original Chino Winetasting — discounted variant (waist=29, fit=Tailored, length=30).
  'stretch-washed-chino-1-winetasting-pocket-liner-0': { waist: '29', fit: 'Tailored', length: '30' },
  // Promotional pick — The Chino 2.0 Brownstones — discounted variant.
  'stretch-washed-chino-brownstones': { waist: '28', fit: 'Tailored', length: '28' },
};

/**
 * CP_020 — recorded image-src stems for product-card clicks.
 *
 * The Final Sale / Promotional cards on /collections/sale and the homepage are
 * targeted by their `<img>` tile. The full `src` carries `v=…&width=…` query
 * params that change with every theme rebuild, so we match on the stable stem
 * (image filename including the Bonobos product SKU).
 *
 *   finalSale     `PANT_CHINO-PANT_BWB00809S1006P` → The Original Chino - Winetasting
 *   promotional   `PANT_CHINO-PANT_BPT10629S1818B` → The Chino 2.0 - Brownstones
 */
const cp020RecordedImageSrcStems = {
  finalSale: 'PANT_CHINO-PANT_BWB00809S1006P',
  promotional: 'PANT_CHINO-PANT_BPT10629S1818B',
};

/**
 * CP_020 — recorded SALE mega-menu link XPath.
 *
 * Shopify rebuilds the `aria-controls` id when the theme is republished; if this
 * XPath ever returns 0 matches, fall back to `getByRole('link', { name: 'SALE' })`
 * (handled inside `CartPage.clickCp020SaleNav`).
 */
const cp020SaleNavXPath =
  '//a[@aria-controls="NewHeaderMegaMenu-sections--26447985967397__header_section-menu_column_VVHTDx"]';

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

/** CP_007 — empty-cart “Start with these” merchandising (Bonobos DEV theme; fixed option labels, no .env). */
const cp007Locators = {
  startWithTheseHeading: /start with these/i,
  pantWaistGroupName: /pant waist/i,
  /** Recorded chino tiles — waist, length, then fit before Add to Bag enables. */
  pantWaistLabel: '28',
  pantLengthLabel: '32',
  pantFitLabel: 'Slim',
  theChinoLinkName: /the chino/i,
};

/** CP_011 — PDP pant tiles before Add to Bag (do not use color swatches). */
const cp011Locators = {
  pantWaistLabel: (process.env.CP011_PANT_WAIST || '28').trim(),
  pantLengthLabel: (process.env.CP011_PANT_LENGTH || '28').trim(),
  pantFitLabel: (process.env.CP011_PANT_FIT || 'Tailored').trim(),
};

/**
 * Bonobos PDP product submit — “Add to Bag” / “Update Bag” (Liquid `BuyButtons-…__add-to-cart`).
 * Prefer `data-testid` over role name (label often lives in nested spans; button stays `disabled` until `data-selection-incomplete` clears).
 */
const pdpAddToBagLocators = {
  testId: (process.env.PDP_ADD_TO_BAG_TEST_ID || 'standalone-add-to-cart').trim(),
  refAttr: 'addToCartButton',
};

module.exports = {
  baseUrl,
  expected,
  emptyCartShopLinkNames,
  cp033EmptyCartCategoryLinks,
  emptyCartMerchandisingMinMatch,
  optionalProductPaths,
  cp020Discovery,
  cp020PantVariantByHandle,
  cp020RecordedImageSrcStems,
  cp020SaleNavXPath,
  freeShippingSheet,
  cp002RecordedLocators,
  cp005RecordedLocators,
  cp007Locators,
  cp011Locators,
  pdpAddToBagLocators,
  cp006EmptyCartNavLinks,
};
