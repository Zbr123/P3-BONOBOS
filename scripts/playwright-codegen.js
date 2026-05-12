/**
 * Launch Playwright Codegen against the storefront (or a URL you pass).
 *
 * Usage:
 *   npm run codegen
 *   npm run codegen -- https://bonobos-dev-3.myshopify.com/password
 *   set CODEGEN_URL=https://... && npm run codegen   (Windows CMD)
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
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const baseUrl = process.env.BASE_URL || 'https://bonobos-dev-3.myshopify.com';
const url = process.argv[2] || process.env.CODEGEN_URL || baseUrl;

const result = spawnSync(
  'npx',
  ['playwright', 'codegen', '--target', 'javascript', url],
  {
    stdio: 'inherit',
    shell: true,
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env },
  }
);

process.exit(result.status === null ? 1 : result.status);
