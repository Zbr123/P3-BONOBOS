/**
 * Home-page test data (HP_001..HP_038).
 */

const env = require('../../config/env');
const faker = require('faker');

const baseUrl = env.BASE_URL.replace(/\/+$/, '');

const expected = {
  rootUrl: new RegExp(`^${baseUrl}/?(?:\\?.*)?$`),
  fitQuizUrl: /\/(pages\/fit-quiz|fit-quiz)/i,
  guideshopUrl: /\/(pages\/(guideshops|locations|find-a-store)|guideshops)/i,
  discountUrl: /\/(pages\/(promotional-offers|sale|discounts)|discount)/i,
  promotionalAdUrl:
    /\/(pages\/(promotional-offers|sale|discounts)|collections\/(sale|promo|.+sale.+))/i,

  /** HP_010 — Shopify storefront search or collection listing. */
  searchOrCollectionUrl: /\/(search|collections)/i,

  /** HP_012 — SALE landing (collection slug or sale hub page). */
  saleLandingUrl:
    /\/(collections\/sale\b|collections\/[^/]*sale[^/]*|pages\/(sale|promotional-offers))/i,

  /** HP_013 — PLP after mega category (jeans / pants collection or search). */
  jeansPantsCollectionUrl:
    /\/(collections\/[^/]*(jean|pant|denim|trouser|bottom)[^/]*|search)/i,

  /** HP_014 — Customer sign-in (classic storefront + Customer Account / Shop identity). */
  accountLoginUrl:
    /\/account\/login|\/customer_authentication\/login|shopify\.com\/[\w./-]*authentication/i,

  /** HP_015–HP_038 — left homepage root. */
  notHomePath: /\/(collections|products|pages|search|cart|account)/i,

  /** HP_022 / HP_023 — PDP or product modal. */
  productExperienceUrl:
    /\/(products\/|collections\/[^/]+\/products\/|\?.*variant=)/i,

  /** HP_035 — policy destinations (theme copy may vary). */
  termsPolicyUrl:
    /\/policies\/terms-of-service|\/policies\/terms|terms-of-service|\/pages\/terms/i,
  privacyPolicyUrl:
    /\/policies\/privacy-policy|\/policies\/privacy|privacy-notice|privacy-policy/i,

  /** HP_036 — outbound social hosts. */
  recognisedSocialHost:
    /instagram\.com|facebook\.com|meta\.com|twitter\.com|x\.com|tiktok\.com|pinterest\.com|youtube\.com|youtu\.be/i,
};

const links = {
  findYourFit: {
    key: 'findYourFit',
    label: 'FIND YOUR FIT',
    expectedUrl: expected.fitQuizUrl,
    expectedPageDescription: 'FIT QUIZ page',
  },
  findALocation: {
    key: 'findALocation',
    label: 'FIND A LOCATION',
    expectedUrl: expected.guideshopUrl,
    expectedPageDescription: 'guideshop location page',
  },
  get25Off: {
    key: 'get25Off',
    label: 'GET 25% OFF',
    expectedUrl: expected.discountUrl,
    expectedPageDescription: 'discount page',
  },
  promotionalAd: {
    key: 'promotionalAd',
    label: 'Promotional discount link',
    expectedUrl: expected.promotionalAdUrl,
    expectedPageDescription: 'correct promotional product/sale page',
  },
};

/** HP_013 — megamenu label (theme copy may vary slightly on DEV). */
const megamenuJeansPantsLabels = [
  'All New Jeans & Pants',
  'Jeans & Pants',
  'All New Jeans',
  'Jeans',
];

/** HP_033 — RFC-looking inbox for Klaviyo / Shopify newsletter tests. */
function newsletterTestEmail() {
  if (process.env.NEWSLETTER_TEST_EMAIL) {
    return process.env.NEWSLETTER_TEST_EMAIL;
  }
  return faker.internet.email().toLowerCase();
}

/** HP_019 — “Your Perfect Fit” collection tile link accessible names (DEV theme). */
const perfectFitCollectionCardNames = [
  'Test Collection 1 Cozy',
  'Test Collection 2 Wool Pants',
  'Test Collection 3 Winter',
  'Test Collection 4 Heavy',
];

module.exports = {
  baseUrl,
  expected,
  links,
  megamenuJeansPantsLabels,
  newsletterTestEmail,
  perfectFitCollectionCardNames,
};
