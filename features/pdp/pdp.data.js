/**
 * PDP module — high-variant shirt archetype (PDP_001..PDP_004).
 *
 * Pin concrete `/products/...` URLs in `.env` when merchandising moves; otherwise
 * the suite discovers the first shirt PDP from `PDP_SHIRT_COLLECTION_PATH`.
 */

const env = require('../../config/env');

const baseUrl = env.BASE_URL.replace(/\/+$/, '');

/** Full storefront path to the “master” high-variant shirt PDP (6+ option dimensions). */
const highVariantShirtPath = (process.env.PDP_HIGH_VARIANT_SHIRT_PATH || '').trim();

/** Collection used only when `PDP_HIGH_VARIANT_SHIRT_PATH` is unset (first `/products/` card). */
const shirtDiscoveryCollectionPath = (
  process.env.PDP_SHIRT_COLLECTION_PATH || '/collections/dress-shirts'
).trim();

/** PDP_004 — Everyday Linen (pin when the SKU is stable on DEV). */
const everydayLinenShirtPath = (process.env.PDP_EVERYDAY_LINEN_SHIRT_PATH || '').trim();

/**
 * PDP_001 — upper bound for navigation + main PDP shell visible (ms).
 *
 * Tuned for a Cloudflare-protected Shopify DEV store. The threshold is generic
 * (storefront-wide SLA), not tied to any specific SKU. Bound below by 5s so a
 * stale value can't make the test trivially pass, and capped at 120s.
 */
const pdpLoadMaxMs = Math.min(Math.max(parseInt(process.env.PDP_LOAD_MAX_MS || '90000', 10), 5000), 120000);

module.exports = {
  baseUrl,
  highVariantShirtPath,
  shirtDiscoveryCollectionPath,
  everydayLinenShirtPath,
  pdpLoadMaxMs,
};
