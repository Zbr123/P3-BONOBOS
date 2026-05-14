/**
 * Load `.env` from this repo root before any support code runs.
 * Cursor / IDEs often start Cucumber with a cwd that is not the project
 * folder, so `process.cwd()`-based dotenv misses `HEADLESS=false` and the
 * browser stays headless.
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const rootEnv = path.join(__dirname, '.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv, override: true });
}

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
