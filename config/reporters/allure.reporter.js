/**
 * Allure formatter for Cucumber-JS.
 *
 * `allure-cucumberjs` v2 ships a `CucumberJSAllureFormatter` that we
 * subclass here so we can control the results directory and any
 * reporter options in code (instead of via fragile JSON-on-CLI flags).
 *
 * Cucumber loads this file via the `format` array in `config/cucumber.js`.
 */

const { AllureRuntime } = require('allure-js-commons');
const { CucumberJSAllureFormatter } = require('allure-cucumberjs');

const { PATHS } = require('../constants');

class AllureReporter extends CucumberJSAllureFormatter {
  constructor(options) {
    super(options, new AllureRuntime({ resultsDir: PATHS.ALLURE_RESULTS }), {
      labels: [
        { pattern: [/@feature:(.*)/], name: 'feature' },
        { pattern: [/@severity:(.*)/], name: 'severity' },
        { pattern: [/@story:(.*)/], name: 'story' },
        { pattern: [/@epic:(.*)/], name: 'epic' },
      ],
      links: [
        {
          pattern: [/@issue=(.*)/],
          type: 'issue',
          urlTemplate: 'https://example.com/issues/%s',
        },
        {
          pattern: [/@tms=(.*)/],
          type: 'tms',
          urlTemplate: 'https://example.com/tms/%s',
        },
      ],
    });
  }
}

module.exports = AllureReporter;
module.exports.default = AllureReporter;
