/**
 * Lightweight API helper.
 *
 * Provides a pre-configured axios client and small ergonomic wrappers for
 * the most common verbs. Centralizing this means:
 *   - one place to set base URL, auth, timeouts
 *   - one place to log/observe API calls
 *   - tests can mock easily by stubbing this module
 */

const axios = require('axios');

const env = require('../config/env');
const logger = require('./logger');
const { mask, safeStringify } = require('./utils');

const client = axios.create({
  baseURL: env.API_BASE_URL || undefined,
  timeout: env.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(env.API_TOKEN ? { Authorization: `Bearer ${env.API_TOKEN}` } : {}),
  },
  validateStatus: () => true, // never throw on HTTP status; let callers decide
});

client.interceptors.request.use((cfg) => {
  logger.debug(`[api] -> ${cfg.method?.toUpperCase()} ${cfg.baseURL || ''}${cfg.url}`, {
    headers: {
      ...cfg.headers,
      Authorization: cfg.headers?.Authorization
        ? mask(cfg.headers.Authorization, 6)
        : undefined,
    },
  });
  return cfg;
});

client.interceptors.response.use((res) => {
  logger.debug(
    `[api] <- ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`
  );
  return res;
});

const get = (url, config) => client.get(url, config);
const post = (url, body, config) => client.post(url, body, config);
const put = (url, body, config) => client.put(url, body, config);
const del = (url, config) => client.delete(url, config);
const patch = (url, body, config) => client.patch(url, body, config);

/**
 * Validate a response: throws unless status matches.
 */
function expectStatus(response, expected = 200) {
  if (response.status !== expected) {
    throw new Error(
      `Expected status ${expected} but got ${response.status}. Body: ${safeStringify(
        response.data
      )}`
    );
  }
  return response;
}

module.exports = {
  client,
  get,
  post,
  put,
  delete: del,
  patch,
  expectStatus,
};
