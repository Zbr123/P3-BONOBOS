/**
 * OTP / 2FA helper.
 *
 * Many Shopify-protected back-ends and partner portals require an email
 * OTP. This helper gives a single async API to retrieve the most recent
 * OTP code from a configured mailbox.
 *
 * This is intentionally pluggable: by default it implements a simple
 * "fixture/manual" strategy (read code from `fixtures/otp.json`) so the
 * framework runs out-of-the-box. Plug in IMAP/Gmail/Mailosaur by
 * implementing `fetchLatestCode()` against your real mailbox.
 */

const path = require('path');
const fs = require('fs-extra');

const env = require('../config/env');
const logger = require('./logger');
const { sleep } = require('./utils');
const { PATHS } = require('../config/constants');

const OTP_FIXTURE = path.join(PATHS.FIXTURES, 'otp.json');

/**
 * Default extractor — searches for a 4-8 digit code in a body string.
 * Override in tests if your provider sends multi-line messages.
 */
function extractCode(body) {
  if (!body) return null;
  const match = String(body).match(/\b(\d{4,8})\b/);
  return match ? match[1] : null;
}

/**
 * Fixture-based fallback. Useful for local dev / offline runs.
 */
function readFixtureCode() {
  if (!fs.existsSync(OTP_FIXTURE)) return null;
  try {
    const json = fs.readJsonSync(OTP_FIXTURE);
    return json.code || null;
  } catch (error) {
    logger.warn(`[otp] failed to read fixture: ${error.message}`);
    return null;
  }
}

/**
 * Fetch the latest OTP code.
 *
 * Strategy:
 *   1. If `OTP_EMAIL` and `OTP_PASSWORD` are configured -> attempt mailbox
 *      fetch (stub here; integrate `imap-simple` or `mailosaur` as needed).
 *   2. Otherwise -> fall back to `fixtures/otp.json`.
 *
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=60000]  total wait
 * @param {number} [opts.intervalMs=3000]  poll interval
 * @returns {Promise<string>} the OTP code
 */
async function fetchLatestCode(opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    let code = null;

    if (env.OTP_EMAIL && env.OTP_PASSWORD) {
      // TODO: integrate IMAP/Mailosaur/Gmail API here.
      // Left intentionally as a stub so the framework stays dependency-light.
      logger.debug('[otp] mailbox fetch not implemented; falling back');
    }

    code = code || readFixtureCode();
    if (code) {
      logger.info(`[otp] retrieved code: ${code}`);
      return code;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out (${timeoutMs}ms) waiting for OTP code`);
}

module.exports = {
  fetchLatestCode,
  extractCode,
};
