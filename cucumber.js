/**
 * Root Cucumber config — picked up automatically by `cucumber-js`.
 *
 * Profiles are defined in `config/cucumber.js` so the data and the
 * Cucumber API surface stay separated. Run with:
 *
 *   npx cucumber-js                 # default profile
 *   npx cucumber-js -p smoke        # smoke profile
 *   npx cucumber-js -p regression   # regression profile
 *   npx cucumber-js -p debug        # headed/debug profile
 *   npx cucumber-js -p parallel     # parallel execution
 *   npx cucumber-js -p retry        # retry @flaky tests once
 *
 * The npm scripts in package.json wrap these for you:
 *
 *   npm test
 *   npm run test:smoke
 *   npm run test:regression
 *   npm run test:debug
 *   npm run test:parallel
 */

module.exports = require('./config/cucumber');
