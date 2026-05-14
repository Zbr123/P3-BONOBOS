/**
 * Launch Playwright Codegen against the storefront (or a URL you pass).
 *
 * Usage:
 *   npm run codegen
 *   npm run codegen -- https://bonobos-dev-3.myshopify.com/password
 *   set CODEGEN_URL=https://... && npm run codegen   (Windows CMD)
 *
 * Cloudflare: stock `playwright codegen` does not use your Cucumber browser
 * profile. When `state/storageState.json` exists (from a successful test run
 * or after you save storage once), this script passes `--load-storage` so
 * Codegen reuses `cf_clearance` and the storefront session like your tests.
 *
 * Optional — persist cookies when you close the Codegen window (after solving
 * Turnstile / using the site):
 *   set CODEGEN_SAVE_STORAGE=true && npm run codegen
 *
 * In the Codegen window:
 *   - Pick "JavaScript" if offered, or use default and still copy locators.
 *   - Click elements → copy `page.locator(...)` / `getByRole(...)` into
 *     `pages/*.page.js` (this repo uses Cucumber + POM, not generated tests).
 *
 * Password gate: open /password in Codegen, type the store password, then
 * navigate to `/` to record header/search/mega-menu locators.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const env = require('../config/env');

const url =
  process.argv[2] ||
  process.env.CODEGEN_URL ||
  env.BASE_URL;

const stateFile = path.isAbsolute(env.STATE_FILE)
  ? env.STATE_FILE
  : path.resolve(__dirname, '..', env.STATE_FILE);

const args = ['playwright', 'codegen', '--target', 'javascript'];

if (env.PERSIST_STATE && stateFile && fs.existsSync(stateFile)) {
  args.push(`--load-storage=${stateFile}`);
  // eslint-disable-next-line no-console
  console.log(`[codegen] loading storage state: ${stateFile}`);
} else if (env.PERSIST_STATE) {
  // eslint-disable-next-line no-console
  console.warn(
    `[codegen] no storage state at ${stateFile} — run a headed test through "Then he should see the homepage" once, or set CODEGEN_SAVE_STORAGE=true after solving Cloudflare.`
  );
}

if (process.env.CODEGEN_SAVE_STORAGE === 'true' && env.PERSIST_STATE && stateFile) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  args.push(`--save-storage=${stateFile}`);
  // eslint-disable-next-line no-console
  console.log(`[codegen] will save storage state on exit -> ${stateFile}`);
}

args.push(url);

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env },
});

process.exit(result.status === null ? 1 : result.status);
