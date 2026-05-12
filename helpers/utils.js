/**
 * General-purpose utilities.
 *
 * Faker-backed data generation, retry/backoff helpers, sleep, slug, etc.
 * Small, pure functions — no Playwright dependency here so they can be
 * unit-tested independently.
 */

const faker = require('faker');

const logger = require('./logger');
const { RETRY } = require('../config/constants');

/**
 * Promise-based sleep.
 * @param {number} ms
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry an async function with exponential backoff.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {object} [opts]
 * @param {number} [opts.attempts=3]
 * @param {number} [opts.delay=500]
 * @param {number} [opts.factor=2]
 * @param {string} [opts.label]
 * @returns {Promise<T>}
 */
async function retry(fn, opts = {}) {
  const attempts = opts.attempts ?? RETRY.DEFAULT_ATTEMPTS;
  const factor = opts.factor ?? 2;
  let delay = opts.delay ?? RETRY.DEFAULT_DELAY_MS;
  const label = opts.label || fn.name || 'anonymous';

  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`[retry:${label}] attempt ${i}/${attempts} failed: ${error.message}`);
      if (i < attempts) {
        await sleep(delay);
        delay *= factor;
      }
    }
  }
  throw lastError;
}

/**
 * Generate a unique-ish ID (timestamp + short random suffix).
 */
const uniqueId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Slugify a string.
 */
const slugify = (str) =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/**
 * Faker-based test data factory.
 */
const data = {
  email: (prefix = 'qa') => `${prefix}+${Date.now()}@${faker.internet.domainName()}`,
  password: () => faker.internet.password(12, false, /[A-Za-z0-9!@#$]/),
  firstName: () => faker.name.firstName(),
  lastName: () => faker.name.lastName(),
  fullName: () => faker.name.findName(),
  phone: () => faker.phone.phoneNumber('##########'),
  address: () => ({
    line1: faker.address.streetAddress(),
    line2: faker.address.secondaryAddress(),
    city: faker.address.city(),
    state: faker.address.stateAbbr(),
    zip: faker.address.zipCode('#####'),
    country: 'US',
  }),
  creditCard: () => ({
    number: '4242424242424242',
    expiry: '12/30',
    cvc: '123',
    name: faker.name.findName(),
  }),
};

/**
 * Mask sensitive values in logs.
 */
const mask = (value, visible = 2) => {
  if (!value) return '';
  const str = String(value);
  if (str.length <= visible) return '*'.repeat(str.length);
  return str.slice(0, visible) + '*'.repeat(str.length - visible);
};

/**
 * Safe JSON stringify (handles circular references).
 */
const safeStringify = (obj, indent = 2) => {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    },
    indent
  );
};

module.exports = {
  sleep,
  retry,
  uniqueId,
  slugify,
  data,
  mask,
  safeStringify,
};
