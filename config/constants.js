/**
 * Project-wide constants.
 *
 * Keep all magic strings, paths and tag names here so the rest of the
 * codebase stays declarative and easy for AI tooling to reason about.
 */

const path = require('path');

const ROOT = process.cwd();

const PATHS = {
  ROOT,
  REPORTS: path.join(ROOT, 'reports'),
  ALLURE_RESULTS: path.join(ROOT, 'reports', 'allure-results'),
  ALLURE_REPORT: path.join(ROOT, 'reports', 'allure-report'),
  SCREENSHOTS: path.join(ROOT, 'screenshots'),
  VIDEOS: path.join(ROOT, 'videos'),
  TRACES: path.join(ROOT, 'traces'),
  LOGS: path.join(ROOT, 'logs'),
  FIXTURES: path.join(ROOT, 'fixtures'),
  DOWNLOADS: path.join(ROOT, 'downloads'),
  STATE: path.join(ROOT, 'state'),
};

const TAGS = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  LOGIN: '@login',
  CHECKOUT: '@checkout',
  DEBUG: '@debug',
  SKIP: '@skip',
};

const TIMEOUTS = {
  TINY: 2_000,
  SHORT: 5_000,
  MEDIUM: 15_000,
  LONG: 30_000,
  EXTRA_LONG: 60_000,
};

const RETRY = {
  DEFAULT_ATTEMPTS: 3,
  DEFAULT_DELAY_MS: 500,
};

module.exports = {
  PATHS,
  TAGS,
  TIMEOUTS,
  RETRY,
};
