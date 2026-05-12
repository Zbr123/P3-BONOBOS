/**
 * Environment loader.
 *
 * Loads variables from `.env` (if present) and exposes a single `env` object
 * with sensible defaults so the rest of the framework never reads
 * `process.env` directly. This keeps configuration centralized, easy to
 * test, and easy to override per environment.
 */

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs-extra');

const ENV_FILE = path.resolve(process.cwd(), '.env');

if (fs.existsSync(ENV_FILE)) {
  dotenv.config({ path: ENV_FILE });
} else {
  dotenv.config();
}

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  // Runtime
  NODE_ENV: process.env.NODE_ENV || 'development',

  // App under test — Bonobos DEV storefront (password-gated Shopify host).
  BASE_URL: (process.env.BASE_URL || 'https://bonobos-dev-3.myshopify.com').replace(
    /\/+$/,
    ''
  ),
  ADMIN_URL: process.env.ADMIN_URL || '',
  STORE_PASSWORD: process.env.STORE_PASSWORD || '',

  // Browser
  BROWSER: process.env.BROWSER || 'chromium',
  HEADLESS: toBool(process.env.HEADLESS, true),
  SLOW_MO: toInt(process.env.SLOW_MO, 0),
  VIEWPORT_WIDTH: toInt(process.env.VIEWPORT_WIDTH, 1440),
  VIEWPORT_HEIGHT: toInt(process.env.VIEWPORT_HEIGHT, 900),
  CHANNEL: process.env.CHANNEL || '', // e.g. 'chrome' | 'msedge'

  // Timeouts (ms)
  DEFAULT_TIMEOUT: toInt(process.env.DEFAULT_TIMEOUT, 30_000),
  NAVIGATION_TIMEOUT: toInt(process.env.NAVIGATION_TIMEOUT, 60_000),
  EXPECT_TIMEOUT: toInt(process.env.EXPECT_TIMEOUT, 10_000),

  // Tracing / video / screenshots (off by default — set TRACE/VIDEO=true to record)
  TRACE: toBool(process.env.TRACE, false),
  VIDEO: toBool(process.env.VIDEO, false),
  SCREENSHOT_ON_FAILURE: toBool(process.env.SCREENSHOT_ON_FAILURE, true),

  // Credentials
  USERNAME: process.env.USERNAME_TEST || process.env.TEST_USERNAME || '',
  PASSWORD: process.env.PASSWORD_TEST || process.env.TEST_PASSWORD || '',

  // OTP / 2FA mailbox
  OTP_EMAIL: process.env.OTP_EMAIL || '',
  OTP_PASSWORD: process.env.OTP_PASSWORD || '',
  OTP_IMAP_HOST: process.env.OTP_IMAP_HOST || '',
  OTP_IMAP_PORT: toInt(process.env.OTP_IMAP_PORT, 993),

  // API
  API_BASE_URL: process.env.API_BASE_URL || '',
  API_TOKEN: process.env.API_TOKEN || '',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Cloudflare / bot-management resilience
  CF_WAIT_MS: toInt(process.env.CF_WAIT_MS, 90_000),
  PERSIST_STATE: toBool(process.env.PERSIST_STATE, true),
  STATE_FILE:
    process.env.STATE_FILE ||
    path.resolve(process.cwd(), 'state', 'storageState.json'),

  /** Optional full CSS for the homepage hero slideshow root (HP_018). */
  HERO_SLIDESHOW_ROOT: (process.env.HERO_SLIDESHOW_ROOT || '').trim(),
  /**
   * HP_018 — how many hero slides to walk (Next count = slides − 1).
   * Bonobos DEV hero has **3** slides; `.slick-*` DOM counts are often wrong
   * (clones / no dots). Set `0` in .env to infer from DOM instead.
   */
  HERO_SLIDESHOW_SLIDES: toInt(process.env.HERO_SLIDESHOW_SLIDES, 3),
};

module.exports = env;
