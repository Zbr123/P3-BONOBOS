/**
 * Cucumber profiles (consumed by the root `cucumber.js`).
 *
 * Uses the modern Cucumber-JS v10+ config object syntax — easier for
 * Cursor AI to read/edit than long CLI strings, and more reliable on
 * Windows where shell quoting is fragile.
 */

/**
 * Format strings note: Cucumber-JS treats colons as separators, so paths
 * (especially Windows `C:\...`) must be QUOTED. We also use forward
 * slashes for the formatter path for cross-platform compatibility — the
 * path is resolved relative to the project root.
 */

const ALLURE_FORMATTER = './config/reporters/allure.reporter.js';

/** Common config used as a base for every profile. */
const common = {
  paths: ['features/**/*.feature'],
  require: [
    'features/hooks/world.js',
    'features/hooks/hooks.js',
    'features/hooks/common.steps.js',
    'features/**/*.steps.js',
  ],
  requireModule: ['dotenv/config'],
  format: [
    'progress-bar',
    '"html":"reports/cucumber-report.html"',
    '"json":"reports/cucumber-report.json"',
    `"${ALLURE_FORMATTER}"`,
  ],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  worldParameters: {},
};

const profiles = {
  default: { ...common },

  smoke: { ...common, tags: '@smoke and not @skip' },

  regression: { ...common, tags: '@regression and not @skip' },

  debug: {
    ...common,
    tags: '@debug',
    format: ['progress-bar'], // lighter formatter for fast iteration
  },

  parallel: { ...common, parallel: 3 },

  retry: { ...common, retry: 1, retryTagFilter: '@flaky' },
};

module.exports = profiles;
