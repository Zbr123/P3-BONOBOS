# P3-BONOBOS — Playwright + Cucumber BDD Framework

Enterprise-grade Node.js browser automation framework built on **Playwright + Cucumber + Page Object Model**, written in pure CommonJS JavaScript (no `.mjs`, no TypeScript), and optimized for **Cursor AI workflows**, **Playwright CLI**, and **Shopify automation** (Bonobos storefront/admin).

---

## Table of contents

- [Why this framework](#why-this-framework)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [npm scripts](#npm-scripts)
- [Writing a new page](#writing-a-new-page)
- [Writing a new feature](#writing-a-new-feature)
- [Hooks & lifecycle](#hooks--lifecycle)
- [Reporting](#reporting)
- [Debugging](#debugging)
- [AI-friendliness (Cursor)](#ai-friendliness-cursor)

---

## Why this framework

- **Playwright via `playwright-extra` + stealth** — bypasses common bot-detection on Shopify storefronts.
- **Cucumber BDD** — human-readable feature files for QA/PM/dev alignment.
- **POM (Page Object Model)** — selectors and UI actions live in one place per screen.
- **Thin step layer** — steps call page methods, never `page.click` directly.
- **Centralized helpers** — logger, waits, retries, API, OTP, file utilities.
- **Allure + HTML reports** — rich, attachable reports with screenshots/traces.
- **Cursor AI-ready** — descriptive naming, low coupling, clean modules so the AI can extend it safely.

---

## Project structure

```
project-root/
├── config/
│   ├── env.js           # dotenv loader + typed env object
│   ├── browser.js       # Chromium (playwright-extra) + Stealth + context options
│   ├── cucumber.js      # Cucumber profiles (default/smoke/regression/debug/parallel)
│   └── constants.js     # Paths, tags, timeouts, retry defaults
│
├── features/
│   ├── login/
│   │   ├── login.feature
│   │   ├── login.steps.js
│   │   └── login.data.js
│   └── hooks/
│       ├── world.js         # Custom Cucumber World
│       ├── hooks.js         # BeforeAll/Before/AfterStep/After/AfterAll
│       └── common.steps.js  # Reusable generic steps
│
├── pages/
│   ├── base.page.js     # Click/fill/wait/screenshot wrappers + retry-safe actions
│   ├── login.page.js
│   ├── dashboard.page.js
│   ├── common/
│   │   ├── header.component.js
│   │   └── footer.component.js
│   └── index.js         # barrel export
│
├── helpers/
│   ├── logger.js        # Winston (console + dated file)
│   ├── utils.js         # sleep, retry, faker data, mask, slugify
│   ├── api.helper.js    # axios client with interceptors
│   ├── wait.helper.js   # forVisible/forHidden/forURL/forCondition
│   ├── file.helper.js   # JSON read/write, fixture loading, screenshot paths
│   ├── otp.helper.js    # pluggable OTP strategy (mailbox or fixture)
│   ├── browser.helper.js# session start/stop, screenshot
│   └── index.js         # barrel export
│
├── fixtures/
│   ├── testData.json    # products, addresses, cards
│   ├── users.json       # named users
│   └── otp.json         # offline OTP fallback
│
├── reports/             # cucumber + allure output (gitignored)
├── screenshots/         # failure screenshots (gitignored)
├── videos/              # context videos (gitignored)
├── traces/              # Playwright traces (gitignored)
├── logs/                # daily log files (gitignored)
│
├── .env.example
├── .gitignore
├── .eslintrc.js
├── .prettierrc.js
├── cucumber.js          # root profile config
├── package.json
└── README.md
```

---

## Tech stack

- **Node.js** 18+
- **[Playwright](https://playwright.dev)** + **`@playwright/test`** (for `expect`)
- **[`playwright-extra`](https://github.com/berstend/puppeteer-extra/tree/master/packages/playwright-extra)** + **`puppeteer-extra-plugin-stealth`**
- **[`@cucumber/cucumber`](https://github.com/cucumber/cucumber-js)** v10
- **dotenv**, **axios**, **faker**, **fs-extra**, **winston**
- **allure-cucumberjs** + **allure-commandline**
- **ESLint** + **Prettier**

---

## Quick start

```bash
git clone <repo-url> p3-bonobos
cd p3-bonobos

cp .env.example .env
# fill in TEST_USERNAME / TEST_PASSWORD / etc.

npm install
npm run install:browsers      # downloads Chromium

npm test                       # run everything
npm run test:smoke             # @smoke tag only
npm run test:headed            # see the browser
npm run report                 # generate + open Allure
```

---

## Environment variables

All env vars are documented in `.env.example`. The framework loads them through `config/env.js`, which exposes a typed `env` object — **never read `process.env` directly elsewhere.**

| Variable                  | Description                              | Default                |
| ------------------------- | ---------------------------------------- | ---------------------- |
| `BASE_URL`                | Storefront URL                           | `https://bonobos.com`  |
| `HEADLESS`                | Run headless                             | `true`                 |
| `SLOW_MO`                 | ms slow-motion delay                     | `0`                    |
| `VIEWPORT_WIDTH/HEIGHT`   | Browser viewport                         | `1440x900`             |
| `DEFAULT_TIMEOUT`         | Action timeout (ms)                      | `30000`                |
| `NAVIGATION_TIMEOUT`      | Nav timeout (ms)                         | `60000`                |
| `TRACE` / `VIDEO`         | Capture trace / video                    | `false`                |
| `SCREENSHOT_ON_FAILURE`   | Auto-screenshot on step fail             | `true`                 |
| `TEST_USERNAME` / `TEST_PASSWORD` | Customer creds                   | —                      |
| `OTP_EMAIL` / `OTP_PASSWORD` | 2FA mailbox creds                     | —                      |
| `API_BASE_URL` / `API_TOKEN` | REST helper config                    | —                      |
| `LOG_LEVEL`               | winston log level                        | `info`                 |

---

## npm scripts

| Script                  | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `npm test`              | Run all features (default profile)                |
| `npm run test:headed`   | Headed run (`HEADLESS=false`)                     |
| `npm run test:smoke`    | `@smoke` tagged scenarios only                    |
| `npm run test:regression` | `@regression` tagged scenarios only             |
| `npm run test:login`    | `@login` feature only                             |
| `npm run test:debug`    | Headed + slow-mo + verbose Playwright debug logs  |
| `npm run test:parallel` | Parallel workers (3 by default)                   |
| `npm run test:retry`    | Retry failed scenarios once                       |
| `npm run report`        | Generate + open Allure report                     |
| `npm run clean`         | Wipe reports / screenshots / traces / logs        |
| `npm run lint`          | ESLint                                            |
| `npm run format`        | Prettier write                                    |
| `npm run install:browsers` | Download Playwright browsers                   |

You can always drop down to the Playwright/Cucumber CLI directly:

```bash
npx cucumber-js -p smoke
npx cucumber-js features/login --tags "@regression and not @skip"
npx playwright show-trace traces/<scenario>-<timestamp>.zip
```

---

## Writing a new page

1. Create `pages/<screen>.page.js`.
2. Extend `BasePage`. Add a `selectors` object at the top.
3. Expose **only UI actions** — no assertions, no test data.
4. Re-export from `pages/index.js`.

```js
const BasePage = require('./base.page');

class CartPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/cart';
    this.selectors = {
      lineItem: '[data-test="cart-line-item"]',
      checkoutBtn: 'button:has-text("Check out")',
    };
  }

  async open() { await this.goto(this.path); }
  async checkout() { await this.click(this.selectors.checkoutBtn); }
  async getItemCount() { return this.$(this.selectors.lineItem).count(); }
}

module.exports = CartPage;
```

---

## Writing a new feature

1. Create `features/<area>/<area>.feature`.
2. Create `features/<area>/<area>.steps.js` (thin layer; calls page methods + `expect`).
3. Optional: `features/<area>/<area>.data.js` for fixtures/users.

```gherkin
@cart @smoke
Feature: Cart

  Scenario: Add a product to the cart
    Given the customer is on the home page
    When the customer adds the product "knit_polo" to the cart
    Then the cart should contain 1 item
```

```js
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

When('the customer adds the product {string} to the cart', async function (key) {
  const product = require('../../fixtures/testData.json').products[key];
  const pdp = this.getPage('ProductPage');
  await pdp.open(product.handle);
  await pdp.selectSize(product.size);
  await pdp.addToCart();
});

Then('the cart should contain {int} item(s)', async function (n) {
  const cart = this.getPage('CartPage');
  await cart.open();
  expect(await cart.getItemCount()).toBe(n);
});
```

---

## Hooks & lifecycle

`features/hooks/hooks.js` runs the framework lifecycle:

- **BeforeAll** — ensure artifact directories exist, log run header.
- **Before** — launch a fresh browser/context/page per scenario, reset world.
- **AfterStep** — auto-screenshot on the **first** failing step (attached to report + saved to `screenshots/`).
- **After** — final screenshot on failure, stop tracing, close session, log status.
- **AfterAll** — log run footer.

Need a shared browser? Move `launchBrowser()` into `BeforeAll` and only create a new context per scenario in `Before` — the helpers already support that pattern.

---

## Reporting

```bash
npm test
npm run report   # generate + open Allure
```

The framework writes:

| Artifact          | Location                                |
| ----------------- | --------------------------------------- |
| Allure results    | `reports/allure-results/`               |
| Allure report     | `reports/allure-report/`                |
| Cucumber HTML     | `reports/cucumber-report.html`          |
| Cucumber JSON     | `reports/cucumber-report.json`          |
| Screenshots       | `screenshots/<scenario>-<ts>.png`       |
| Videos            | `videos/<auto-name>.webm`               |
| Traces            | `traces/<scenario>-<ts>.zip`            |
| Logs              | `logs/test-YYYY-MM-DD.log`              |

---

## Debugging

- Run **headed** + slow motion: `npm run test:debug`
- Single feature: `npx cucumber-js features/login`
- Single scenario tag: `npx cucumber-js --tags "@smoke and @login"`
- Open a trace: `npx playwright show-trace traces/<file>.zip`
- Inspector: `PWDEBUG=1 npx cucumber-js`

---

## AI-friendliness (Cursor)

This framework is intentionally structured so AI tooling can:

1. **Discover architecture** — barrel exports (`pages/index.js`, `helpers/index.js`) and consistent file naming.
2. **Generate new pages** — copy `pages/login.page.js` → swap selectors + path.
3. **Generate new steps** — pattern is fixed: `getPage(...)` → page method → `expect`.
4. **Debug failures fast** — every action logs with a label; failures auto-screenshot and save traces; log files are dated.
5. **Stay safe** — pages contain no assertions; steps contain no selectors; tests share state through `this.state` only.

When prompting Cursor, point it at this README and the relevant `pages/`, `features/`, or `helpers/` folder — the architecture is small enough to fit comfortably in a single context window.

---

## License

MIT.
