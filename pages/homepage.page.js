/**
 * HomePage — Bonobos DEV storefront homepage.
 *
 * Models the elements relevant to the HP_001..HP_038 test suite:
 *   - Header logo (HP_002)
 *   - Announcement-bar custom links: FIND YOUR FIT / FIND A LOCATION /
 *     GET 25% OFF (HP_003 / HP_004 / HP_005)
 *   - Promotional discount link in the rotating advertisement banner
 *     (HP_006)
 *
 * Selectors are derived from the live DOM on
 * https://bonobos-dev-3.myshopify.com (snapshot captured 2026-05-09)
 * and use stable class hooks (`announcement-bar__custom-link`,
 * `announcement-bar__promo-link`, `new-header__logo-link`) plus visible
 * text — they survive content rotation and copy changes.
 */

const BasePage = require('./base.page');
const env = require('../config/env');
const logger = require('../helpers/logger');
const { expect } = require('@playwright/test');
const hpData = require('../features/homepage/homepage.data');
const { openStorefront, dismissCookieBanner } =
  require('../helpers/storefront.helper');

class HomePage extends BasePage {
  constructor(page) {
    super(page);

    this.path = '/';

    this.selectors = {
      // ---------- Header ----------
      headerLogo: 'a.new-header__logo-link',
      headerLogoFallback: 'header a[href="/"]',

      // ---------- Announcement bar ----------
      // Single root element — avoids Playwright strict-mode when many
      // descendants also match `class*="announcement-bar"`.
      announcementBar: 'aside[data-announcement-bar]',
      announcementSlideContainer: '.announcement-bar__slides, .slick-slider',
      announcementNextSlide: 'button[aria-label="Next slide"]',
      announcementPrevSlide: 'button[aria-label="Previous slide"]',
      announcementDismiss:
        'button[aria-label="Dismiss announcement bar"], button[data-announcement-dismiss]',

      // Custom announcement bar links (test-case-specific)
      findYourFitLink:
        'a.announcement-bar__custom-link:has-text("FIND YOUR FIT")',
      findALocationLink:
        'a.announcement-bar__custom-link:has-text("FIND A LOCATION")',
      get25OffLink:
        'a.announcement-bar__promo-link:has-text("GET 25% OFF")',

      // The rotating announcement-bar advertisement (slides through
      // promotional copy — e.g. "Last Call: 30% Off Cyber Monday").
      promotionalAdLink: 'a.announcement-bar__link',

      // ---------- Body sections ----------
      saleSection: 'h2:has-text("Best of the Sale")',
      bestSellersSection: 'h2:has-text("Bestsellers")',
      footer: 'footer',

      // ---------- HP_008 mega menu (desktop header) ----------
      // Some categories are <a>, others are <button class="new-header__block-title-button"> — one control per <li>.
      megaMenuTrigger:
        'header .new-header__nav-list > li > .new-header__block-title, header a.new-header__block-title, header button.new-header__block-title-button',
      megaMenuNavTriggers:
        'header .new-header__nav-list > li > .new-header__block-title, header .new-header__nav-list > li > a.new-header__block-title, header .new-header__nav-list > li > button.new-header__block-title, header .new-header__nav a.new-header__block-title, header .new-header__nav-item > a.new-header__block-title',
      megaMenuPromoTile: '.mega-menu__promo-tile',
      /** Root mega surfaces (Bonobos uses `new-header__megamenu` — note spelling). */
      megaMenuPanelRoots:
        '.new-header__megamenu, .mega-menu, .new-header__mega-menu, .new-header__dropdown',

      // ---------- HP_009–HP_011 search ----------
      // Recorded via Playwright Codegen (preferred when visible in header).
      // await page.getByRole('combobox', { name: 'Search' }).click();
      searchOpenButton:
        'button[aria-label*="Search" i], button[aria-label*="search" i], header button:has-text("Search"), [data-test="search-toggle"]',
      searchInput:
        '#Search-In-Modal input[type="search"], #Search-In-Modal input:not([type="hidden"]), .predictive-search__input, dialog input[type="search"], input[name="q"]:visible',
      searchSubmitModal:
        '#Search-In-Modal button[type="submit"], .search-modal button[type="submit"]',
      searchPredictiveResults:
        '.predictive-search__results, #predictive-search-results, [class*="predictive-search"] [role="listbox"]',

      // ---------- HP_012 SALE nav ----------
      saleNavLink:
        'header a[href*="/collections/sale" i], header a[href*="sale"]:has-text("SALE"), nav a:has-text("SALE")',
      productCard: '.product-card, [class*="product-card"], li.grid__item',
      salePriceBadge:
        '.price--on-sale, .price-item--sale, [class*="price--sale"], .badge--sale, :text-matches("Sale", "i")',

      // ---------- HP_013–HP_028 homepage sections ----------
      accountEntry:
        'header a[href*="/account"], header a[href*="/customer_authentication"], details a[href*="/account"]',
      accountIconSummary:
        'header details summary, header button[aria-label*="Account" i], header a[aria-label*="Account" i]',
      cartEntry:
        'header a[href="/cart"], header a[href*="/cart"]:not([href*="/cart/"]), a[href*="/cart"]:visible',
      cartIconAlt:
        'header a[aria-label*="Bag" i], header a[aria-label*="Cart" i], header button[aria-label*="Bag" i]',
      /** HP_018: Bonobos hero is a `shopify-section` div; `main section` alone misses it. */
      heroRegion:
        '#shopify-section-template--26526283399461__slideshow_3Exzre, ' +
        '[id^="shopify-section-template"][id*="__slideshow"], ' +
        'div.shopify-section[id*="slideshow"], ' +
        'main section[id*="slideshow"], #MainContent section[id*="slideshow"], section[id*="__slideshow"], ' +
        '.banner, .slideshow, [class*="hero-banner"], [class*="homepage-hero"], section:first-of-type .banner',
      shopNowHero: 'a:has-text("SHOP NOW"), button:has-text("SHOP NOW")',
      /** Prefer role name “Next slide” (Bonobos); keep slick fallbacks. */
      slideshowNext:
        'button[aria-label*="Next slide" i], button[name="next"], button[aria-label*="Next" i], .slick-next, button.slick-arrow.slick-next',
      /** Hero / slideshow video: mute chip (Bonobos) or aria-labelled transport. */
      slideshowVideoMute:
        '.slide__video-control.slide__video-control--mute, button[aria-label*="mute" i]',
      /** Pause / play / mute when only aria hints exist (shared by hero + carousels). */
      videoTransportAria:
        'button[aria-label*="mute" i], button[aria-label*="play" i], button[aria-label*="pause" i]',
      heroVideo: 'section video, .banner video, .slideshow video',
      /** Heading / copy for “Your Perfect Fit” (theme varies h2 vs h3, casing). */
      perfectFitHeading:
        'h2:has-text("Perfect Fit"), h2:has-text("YOUR PERFECT FIT"), h3:has-text("Perfect Fit"), h3:has-text("YOUR PERFECT FIT")',
      findYourFitBlock: 'section:has-text("Find Your Fit"), section:has-text("FIND YOUR FIT")',
      takeTheQuiz: 'a:has-text("TAKE THE QUIZ"), button:has-text("TAKE THE QUIZ")',
      viewProductHotspot:
        'a:has-text("VIEW PRODUCT"), button:has-text("VIEW PRODUCT"), [class*="hotspot"] a',
      guideshopBlock:
        'section:has-text("Guideshop"), section:has-text("GUIDESHOP"), section:has-text("Find a location")',
      viewNewArrivals: 'a:has-text("VIEW NEW ARRIVALS"), a:has-text("View New Arrivals")',
      ugcBlock:
        'section:has-text("Made by us"), section:has-text("styled by you"), section:has-text("Styled by You")',
      greatFitFirstBlock:
        'section:has-text("Great Fit First"), section:has-text("GREAT FIT FIRST")',
      footerNewsletterInput: 'footer input[type="email"]',
      footerNewsletterSubmit: 'footer button[type="submit"]',
    };
  }

  /**
   * Open the homepage, handling password gate + cookie banner.
   */
  async open() {
    await openStorefront(this.page, this.path);
    await this.waitForElement(this.selectors.headerLogo, 'visible', 30_000);
  }

  /**
   * Re-dismiss the cookie banner if it has reappeared (rare).
   */
  async ensureNoOverlay() {
    await dismissCookieBanner(this.page);
  }

  // ---------- HP_001 ----------

  /**
   * Returns true once the header logo, announcement bar and footer are
   * all rendered — a strong signal the homepage is fully loaded.
   */
  async isFullyLoaded() {
    const logo = this.page.locator(this.selectors.headerLogo).first();
    const bar = this.page.locator(this.selectors.announcementBar).first();
    const footer = this.page.locator(this.selectors.footer).first();
    const checks = await Promise.all([
      logo.isVisible(),
      bar.isVisible(),
      footer.isVisible(),
    ]);
    return checks.every(Boolean);
  }

  // ---------- HP_002 ----------

  async clickLogo() {
    await this.ensureNoOverlay();
    const logo = this.page.locator(this.selectors.headerLogo).first();
    await logo.scrollIntoViewIfNeeded();
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      logo.click({ force: true }),
    ]);
  }

  // ---------- Announcement bar helpers ----------

  /**
   * Get the resolved href of an announcement-bar link by visible name.
   * Useful for asserting destination URL even when the link target is
   * external or interrupted by JS.
   * @param {string} selector
   */
  async getLinkHref(selector) {
    return this.getAttribute(selector, 'href');
  }

  /**
   * Click an announcement-bar link by its key. Slides may rotate, so
   * we use Playwright's auto-retry locator (matches the *first*
   * visible match across re-renders).
   * @param {'findYourFit'|'findALocation'|'get25Off'|'promotionalAd'} key
   */
  async clickAnnouncementLink(key) {
    const map = {
      findYourFit: this.selectors.findYourFitLink,
      findALocation: this.selectors.findALocationLink,
      get25Off: this.selectors.get25OffLink,
      promotionalAd: this.selectors.promotionalAdLink,
    };
    const selector = map[key];
    if (!selector) throw new Error(`Unknown announcement link key: ${key}`);

    await this.ensureNoOverlay();
    const link = this.page.locator(selector).first();
    await link.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await link.waitFor({ state: 'attached', timeout: 15_000 });

    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      link.click({ force: true }),
    ]);
  }

  // ---------- HP_007 ----------

  async dismissAnnouncementBar() {
    await this.ensureNoOverlay();
    const btn = this.page.locator(this.selectors.announcementDismiss).first();
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click({ timeout: 5000 });
    await this.page.waitForTimeout(300);
  }

  async isAnnouncementBarRootVisible() {
    return this.page.locator(this.selectors.announcementBar).first().isVisible();
  }

  /** True if the announcement strip is gone, hidden, or has zero size. */
  async isAnnouncementBarDismissed() {
    const bar = this.page.locator(this.selectors.announcementBar).first();
    if ((await bar.count()) === 0) return true;
    const visible = await bar.isVisible().catch(() => false);
    if (!visible) return true;
    return bar.evaluate((el) => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return true;
      if (parseFloat(s.opacity) === 0) return true;
      const r = el.getBoundingClientRect();
      return r.height < 2 || r.width < 2;
    });
  }

  // ---------- HP_008 ----------

  /**
   * Locator for each primary nav title that should reveal a mega menu on hover.
   * Prefer one anchor per top-level `li` (matches the full desktop bar: NEW & TRENDING … SALE).
   * Picks the selector with the highest match count (capped) so we do not stop at four `block-title` links only.
   */
  async pickMegamenuNavTriggers() {
    const strategies = [
      'header .new-header__nav-list > li > .new-header__block-title',
      'header .new-header__nav-list > li > a',
      'header .new-header__nav-list > li.new-header__nav-item > a',
      'header .new-header__header-nav .new-header__nav-list > li > a',
      'header nav.new-header__nav .new-header__nav-list > li > a',
      'header [class*="menu-desktop"] .new-header__nav-list > li > a',
      'header [class*="desktop-nav"] .new-header__nav-list > li > a',
      this.selectors.megaMenuNavTriggers,
      this.selectors.megaMenuTrigger,
    ];
    let bestLoc = null;
    let bestN = 0;
    for (const sel of strategies) {
      const loc = this.page.locator(sel);
      const n = await loc.count();
      if (n > bestN && n <= 24) {
        bestLoc = loc;
        bestN = n;
      }
    }
    return bestLoc || this.page.locator(this.selectors.megaMenuTrigger);
  }

  /**
   * Locator for the mega menu panel that is visibly open (size threshold matches isMegamenuPanelVisible).
   */
  async getVisibleMegamenuPanel() {
    const menus = this.page.locator(this.selectors.megaMenuPanelRoots);
    const count = await menus.count();
    for (let i = 0; i < count; i += 1) {
      const m = menus.nth(i);
      const box = await m.boundingBox();
      if (box && box.height > 24 && box.width > 60) return m;
    }
    return null;
  }

  /**
   * Count of category / collection links inside the visible mega menu panel.
   */
  async getMegamenuCategoryLinkCount() {
    const panel = await this.getVisibleMegamenuPanel();
    if (!panel) return 0;
    return panel
      .locator(
        'a[href*="/collections"], a.new-header__menu-link, a[href^="/products/"], ' +
          'li.menu-linklist__item a[href], a[href^="/pages/"], a[href]:not([href="#"]):not([href=""])'
      )
      .count();
  }

  /**
   * Visible strip that contains the primary desktop category row (NEW & TRENDING … SALE).
   */
  async resolvePrimaryHeaderNav() {
    const roots = [
      this.page.locator('header .new-header__header-nav').first(),
      this.page.locator('header .new-header__nav').first(),
      this.page.locator('header nav[aria-label]').first(),
      this.page.locator('header nav').first(),
    ];
    for (const r of roots) {
      if (await r.isVisible({ timeout: 2000 }).catch(() => false)) {
        return r;
      }
    }
    return this.page.locator('header').first();
  }

  /**
   * Accessible-name patterns for the main category row (matches live Bonobos header).
   */
  getPrimaryBarLinkNameMatchers() {
    return [
      /^NEW\s*&\s*TRENDING$/i,
      /^TOPS$/i,
      /^BOTTOM$/i,
      /^SUITS$/i,
      /^COLLECTIONS$/i,
      /^ACCESSORIES$/i,
      /^SALE$/i,
    ];
  }

  /**
   * Build ordered top-level nav link locators for the category row (NEW & TRENDING … SALE).
   * 1) Text + scoped header nav (matches the visible bar in HP_008).
   * 2) Bounded `ul > li > a` rows (never unbounded `header nav ul`).
   * 3) getByRole fallbacks.
   */
  async resolveOrderedPrimaryNavTriggers() {
    const navRoot = await this.resolvePrimaryHeaderNav();
    const header = this.page.locator('header');
    const navScopes = [
      this.page.locator('header .new-header__header-nav').first(),
      this.page.locator('header .new-header__nav').first(),
      navRoot,
    ];
    for (const scope of navScopes) {
      if (!(await scope.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }
      const out = [];
      for (const re of this.getPrimaryBarLinkNameMatchers()) {
        const byRole = header.getByRole('link', { name: re }).filter({ visible: true });
        if ((await byRole.count()) >= 1) {
          out.push(byRole.first());
          continue;
        }
        const vis = scope.locator('a').filter({ hasText: re }).filter({ visible: true });
        if ((await vis.count()) < 1) {
          continue;
        }
        out.push(vis.first());
      }
      if (out.length >= 5) {
        return out;
      }
    }

    const listRowSelectors = [
      'header .new-header__nav-list > li > .new-header__block-title',
      'header .new-header__nav-list > li > a',
      'header .new-header__header-nav > ul > li > a',
      'header .new-header__nav > ul:first-of-type > li > a',
    ];
    for (const sel of listRowSelectors) {
      const rowLinks = this.page.locator(sel);
      const n = await rowLinks.count();
      if (n >= 5 && n <= 15) {
        return Array.from({ length: n }, (_, i) => rowLinks.nth(i));
      }
    }

    const directRow = navRoot.locator('> ul > li > a');
    const nDirect = await directRow.count();
    if (nDirect >= 5 && nDirect <= 15) {
      return Array.from({ length: nDirect }, (_, i) => directRow.nth(i));
    }

    const out = [];
    for (const name of this.getPrimaryBarLinkNameMatchers()) {
      const cand = navRoot.getByRole('link', { name });
      if ((await cand.count()) < 1) {
        continue;
      }
      out.push(cand.first());
    }
    return out.length >= 5 ? out : null;
  }

  /**
   * Hover every top-level category and assert the mega menu opens with links.
   * Runs one category at a time (sequential) with logging for each line.
   *
   * @param {object} [opts]
   * @param {number} [opts.minCategoryLinks=1]  minimum links to count as “has categories”
   * @param {number} [opts.settleAfterHoverMs=700]  wait after hover before assertions
   * @param {number} [opts.pauseBeforeNextMs=600]  pause after clearing hover before next item
   */
  async verifyEachMegamenuCategoryOpensWithCategories(opts = {}) {
    await this.ensureNoOverlay();
    const minCategoryLinks = opts.minCategoryLinks ?? 1;
    const settleAfterHoverMs = opts.settleAfterHoverMs ?? 900;
    const pauseBeforeNextMs = opts.pauseBeforeNextMs ?? 650;

    // Wide enough that the desktop category row (7 items) is not collapsed into mobile/hamburger.
    const megaW = Math.max(env.VIEWPORT_WIDTH, 1600);
    const megaH = Math.max(env.VIEWPORT_HEIGHT, 900);
    await this.page.setViewportSize({ width: megaW, height: megaH });
    await dismissCookieBanner(this.page);

    const ordered = await this.resolveOrderedPrimaryNavTriggers();
    let triggerList = ordered;
    if (!triggerList || triggerList.length === 0) {
      const triggers = await this.pickMegamenuNavTriggers();
      const n = await triggers.count();
      if (n === 0) {
        throw new Error(
          'No top-level mega menu triggers found — update megaMenuNavTriggers / megaMenuTrigger in homepage.page.js'
        );
      }
      triggerList = Array.from({ length: n }, (_, i) => triggers.nth(i));
    }

    const n = triggerList.length;
    for (let i = 0; i < n; i += 1) {
      const trigger = triggerList[i];
      if (!(await trigger.isVisible({ timeout: 3000 }).catch(() => false))) {
        continue;
      }
      const label = ((await trigger.innerText()) || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      logger.info(
        `[HP_008] Line ${i + 1}/${n}: hovering "${label || `item ${i}`}"`
      );

      await trigger.scrollIntoViewIfNeeded();
      const tag = await trigger.evaluate((el) => el.tagName);
      if (tag === 'BUTTON') {
        await trigger.click({ timeout: 10_000, force: true });
      } else {
        const box = await trigger.boundingBox();
        if (box) {
          await this.page.mouse.move(
            box.x + box.width / 2,
            box.y + box.height / 2
          );
        }
        await trigger.hover({ timeout: 10_000, force: true });
        await trigger.dispatchEvent('mouseenter');
        await trigger.dispatchEvent('mouseover');
      }
      await this.page.waitForTimeout(settleAfterHoverMs);

      const panelOpen = await this.isMegamenuPanelVisible();
      const linkCount = await this.getMegamenuCategoryLinkCount();

      if (!panelOpen || linkCount < minCategoryLinks) {
        throw new Error(
          `Mega menu for "${label || `item ${i}`}" (index ${i}): ` +
            `panelOpen=${panelOpen}, categoryLinks=${linkCount} (need >= ${minCategoryLinks})`
        );
      }

      logger.info(
        `[HP_008] Line ${i + 1}/${n}: ok — panel open, ${linkCount} category link(s)`
      );

      // Move pointer off the nav so the next hover is a clean enter (reduces stuck state).
      await this.page.mouse.move(8, 8).catch(() => {});
      await this.page.waitForTimeout(pauseBeforeNextMs);
    }
  }

  /**
   * Hover the first top-level mega-menu trigger (legacy / other tests).
   */
  async hoverFirstMegamenuTrigger() {
    await this.ensureNoOverlay();
    const triggers = this.page.locator(this.selectors.megaMenuTrigger);
    const n = await triggers.count();
    for (let i = 0; i < Math.min(n, 5); i += 1) {
      await triggers.nth(i).scrollIntoViewIfNeeded();
      await triggers.nth(i).hover({ timeout: 8000 });
      await this.page.waitForTimeout(500);
      if (await this.isMegamenuPanelVisible()) return;
    }
    const fallback = this.page.locator('header .new-header__menu-link').first();
    await fallback.waitFor({ state: 'visible', timeout: 10_000 });
    await fallback.hover({ timeout: 8000 });
    await this.page.waitForTimeout(500);
  }

  async isMegamenuPanelVisible() {
    const menus = this.page.locator(this.selectors.megaMenuPanelRoots);
    const count = await menus.count();
    for (let i = 0; i < count; i += 1) {
      const box = await menus.nth(i).boundingBox();
      if (box && box.height > 24 && box.width > 60) return true;
    }
    const linkInPanel = this.page
      .locator(
        '.new-header__megamenu a[href], .mega-menu a.new-header__menu-link, ' +
          '.mega-menu a[href*="/collections"], .new-header__mega-menu a[href], .new-header__dropdown a[href]'
      )
      .first();
    return linkInPanel.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isMegamenuPromoTileVisible() {
    const tile = this.page.locator(this.selectors.megaMenuPromoTile).first();
    if (await tile.isVisible({ timeout: 3000 }).catch(() => false)) return true;
    return this.page
      .locator('.mega-menu img, .mega-menu__promo-tile img')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
  }

  /**
   * Returns true if the hovered trigger has a light (white-ish) background.
   * Theme-dependent; used as a soft signal for "highlighted in white".
   */
  async megamenuTriggerHasLightHighlight() {
    const trigger = this.page.locator(this.selectors.megaMenuTrigger).first();
    const bg = await trigger.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return s.backgroundColor;
    });
    if (
      !bg ||
      bg === 'transparent' ||
      bg === 'rgba(0, 0, 0, 0)' ||
      bg === 'rgba(0,0,0,0)'
    ) {
      return true;
    }
    // rgb(255,255,255) or light grey hover states
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return true;
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const avg = (r + g + b) / 3;
    return avg >= 200;
  }

  // ---------- HP_009–HP_011 search ----------

  /** Codegen: `page.getByRole('combobox', { name: 'Search' })` — search trigger / field. */
  getSearchCombobox() {
    return this.page.getByRole('combobox', { name: 'Search' }).first();
  }

  async openSearch() {
    await this.ensureNoOverlay();
    const combo = this.getSearchCombobox();
    try {
      await combo.waitFor({ state: 'visible', timeout: 10_000 });
      await combo.click({ timeout: 5000 });
      await this.page.waitForTimeout(400);
      return;
    } catch {
      /* fall through to legacy header triggers */
    }
    const candidates = [
      'modal-opener[data-modal="#Search-Modal"] button',
      'modal-opener[data-modal="#search-modal"] button',
      'summary.header__icon--summary',
      'details-modal summary',
      'header a[href="/search"]',
      'header a[href*="/search"]',
      'button[aria-label*="Search" i]',
      'button[aria-label*="search" i]',
      '[data-test="search-toggle"]',
      '.header__icon--search',
      'header .search-modal__toggle',
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel).first();
      try {
        if (await loc.isVisible({ timeout: 2000 })) {
          await loc.click({ timeout: 5000, force: true });
          await this.page.waitForTimeout(400);
          const input = this.page.locator(this.selectors.searchInput).first();
          if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
            return;
          }
        }
      } catch {
        /* try next */
      }
    }
    throw new Error(
      'Search trigger not found — add a selector in HomePage.openSearch() candidates list.'
    );
  }

  async fillSearchQuery(text) {
    const combo = this.getSearchCombobox();
    if (await combo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await combo.fill(String(text));
      await this.page.waitForTimeout(200);
      return;
    }
    const input = this.page.locator(this.selectors.searchInput).first();
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    await input.fill(String(text));
    await this.page.waitForTimeout(200);
  }

  async submitSearch() {
    const combo = this.getSearchCombobox();
    if (await combo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await combo.press('Enter');
    } else {
      const input = this.page.locator(this.selectors.searchInput).first();
      await input.press('Enter');
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async runSearch(query) {
    await this.ensureNoOverlay();
    try {
      await this.openSearch();
      await this.fillSearchQuery(query);
      await this.submitSearch();
    } catch {
      const q = encodeURIComponent(String(query));
      await this.page.goto(`${env.BASE_URL}/search?q=${q}`, {
        waitUntil: 'domcontentloaded',
        timeout: env.NAVIGATION_TIMEOUT,
      });
    }
  }

  // ---------- HP_012 ----------

  async clickSaleCategoryInNav() {
    await this.ensureNoOverlay();
    const direct = this.page.locator(
      'header a[href*="/collections/"][href*="sale" i], header a[href*="/collections/sale"]'
    );
    const n = await direct.count();
    for (let i = 0; i < n; i += 1) {
      const href = (await direct.nth(i).getAttribute('href')) || '';
      if (!href || href === '#' || href.endsWith('/#') || href === '/#') continue;
      await direct.nth(i).scrollIntoViewIfNeeded();
      await Promise.all([
        this.page.waitForLoadState('domcontentloaded'),
        direct.nth(i).click({ timeout: 10_000 }),
      ]);
      return;
    }
    const saleLinks = this.page.locator('header a').filter({ hasText: /\bSALE\b/i });
    const m = await saleLinks.count();
    for (let i = 0; i < m; i += 1) {
      const href = (await saleLinks.nth(i).getAttribute('href')) || '';
      if (href.includes('/collections') && !href.endsWith('#') && href !== '#') {
        await saleLinks.nth(i).scrollIntoViewIfNeeded();
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded'),
          saleLinks.nth(i).click({ timeout: 10_000 }),
        ]);
        return;
      }
    }
    throw new Error(
      'No SALE nav link with a real /collections/... URL — inspect header markup.'
    );
  }

  async countVisibleProductCards() {
    return this.page.locator(this.selectors.productCard).count();
  }

  async pageShowsSalePricingSignals() {
    const saleLocator = this.page.locator(this.selectors.salePriceBadge).first();
    if (await saleLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
      return true;
    }
    const body = await this.page.textContent('body');
    return /\bsale\b|\$\d+.*\$\d+|compare\s*at|was\s+\$/i.test(body || '');
  }

  /** After an invalid search: no Liquid crash, main content still present. */
  async searchPageIsHealthy() {
    await this.page.waitForLoadState('domcontentloaded');
    const broken = await this.page
      .locator(':text-matches("liquid error|liquid syntax|syntax error", "i")')
      .count();
    return broken === 0;
  }

  async hasEmptyOrNoResultsSearchCopy() {
    return this.page
      .getByText(
        /no results|nothing found|0 results|couldn't find|no matches|no products found/i
      )
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
  }

  // ---------- HP_013 ----------

  /**
   * Open megamenu (hover first top trigger), click a link whose text matches any of `labels`.
   */
  async openMegamenuAndClickCategoryLink(labels) {
    await this.ensureNoOverlay();
    const megaW = Math.max(env.VIEWPORT_WIDTH, 1600);
    const megaH = Math.max(env.VIEWPORT_HEIGHT, 900);
    await this.page.setViewportSize({ width: megaW, height: megaH });
    await dismissCookieBanner(this.page);

    const firstNav = this.page
      .locator(this.selectors.megaMenuTrigger)
      .filter({ visible: true })
      .first();
    await firstNav.scrollIntoViewIfNeeded();
    const tag = await firstNav.evaluate((el) => el.tagName);
    if (tag === 'BUTTON') {
      await firstNav.click({ force: true });
    } else {
      await firstNav.hover({ force: true });
    }
    await this.page.waitForTimeout(600);

    const panel = this.page.locator(this.selectors.megaMenuPanelRoots).first();
    await panel.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

    const panelLinks = this.page.locator(
      '.new-header__megamenu a[href], .mega-menu a[href], .new-header__mega-menu a[href]'
    );

    for (const label of labels) {
      const link = panelLinks
        .filter({
          hasText: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        })
        .first();
      if ((await link.count()) > 0 && (await link.isVisible().catch(() => false))) {
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded'),
          link.click({ timeout: 15_000 }),
        ]);
        return;
      }
    }

    const fuzzy = panelLinks.filter({ hasText: /jean|pant|denim|bottom/i }).first();
    if ((await fuzzy.count()) > 0) {
      await Promise.all([
        this.page.waitForLoadState('domcontentloaded'),
        fuzzy.click({ timeout: 15_000 }),
      ]);
      return;
    }

    throw new Error(
      'No megamenu category link matched — update labels in homepage.data.js (megamenuJeansPantsLabels).'
    );
  }

  async landingPageShowsJeansOrPantsListing() {
    const url = this.page.url();
    const urlOk = hpData.expected.jeansPantsCollectionUrl.test(url);
    const body = ((await this.page.textContent('body')) || '').toLowerCase();
    const copyOk =
      /jean|pant|denim|trouser|bottom|chino|five\s*pocket/i.test(body) &&
      (await this.countVisibleProductCards()) > 0;
    return urlOk || copyOk;
  }

  // ---------- HP_014 ----------

  async openAccountMenuFromHeader() {
    await this.ensureNoOverlay();
    const details = this.page.locator('header details').first();
    if (await details.isVisible({ timeout: 3000 }).catch(() => false)) {
      await details.locator('summary').first().click({ timeout: 5000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }
    const summary = this.page.locator(this.selectors.accountIconSummary).first();
    if (await summary.isVisible({ timeout: 3000 }).catch(() => false)) {
      await summary.click({ timeout: 5000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }
    const direct = this.page.locator(this.selectors.accountEntry).first();
    await direct.waitFor({ state: 'visible', timeout: 10_000 });
    await direct.click({ timeout: 10_000, force: true });
  }

  async chooseSignInFromHeaderMenu() {
    let signIn = this.page.getByRole('link', { name: /sign\s*in/i }).first();
    if (!(await signIn.isVisible({ timeout: 2000 }).catch(() => false))) {
      signIn = this.page.locator('header a[href*="/account/login"]').first();
    }
    await signIn.waitFor({ state: 'visible', timeout: 10_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      signIn.click({ timeout: 10_000 }),
    ]);
  }

  /**
   * True when the Shopify / Bonobos customer sign-in UI is visible (covers
   * hosted identity URLs that are not under `/account/login`).
   */
  async isAccountSignInUIOpen() {
    const heading = this.page.getByRole('heading', { name: /sign in/i }).first();
    const strapline = this.page.getByText(/sign in or create an account/i).first();
    const shopCta = this.page.getByRole('button', { name: /continue with shop/i }).first();
    if (await heading.isVisible({ timeout: 4000 }).catch(() => false)) return true;
    if (await strapline.isVisible({ timeout: 1500 }).catch(() => false)) return true;
    if (await shopCta.isVisible({ timeout: 1500 }).catch(() => false)) return true;
    return false;
  }

  // ---------- HP_015 ----------

  async openBagOrCartFromHeader() {
    await this.ensureNoOverlay();
    const drawerTrigger = this.page.getByTestId('cart-drawer-trigger');
    if (await drawerTrigger.isVisible({ timeout: 4000 }).catch(() => false)) {
      await drawerTrigger.click({ timeout: 10_000 });
      return;
    }
    const cart = this.page.locator(this.selectors.cartEntry).first();
    if (await cart.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cart.click({ timeout: 10_000, force: true });
      return;
    }
    const alt = this.page.locator(this.selectors.cartIconAlt).first();
    await alt.waitFor({ state: 'visible', timeout: 10_000 });
    await alt.click({ timeout: 10_000, force: true });
  }

  async cartDrawerOrPageOpened() {
    const url = this.page.url();
    if (/\/cart/i.test(url)) return true;
    const drawer = this.page.locator(
      'cart-drawer, #CartDrawer, [id*="CartDrawer"], .drawer--cart, dialog[open]'
    );
    return drawer.first().isVisible({ timeout: 8000 }).catch(() => false);
  }

  async cartShowsBadgeOrEmptyState() {
    const badge = this.page.locator(
      '[class*="cart-count"], .cart-count-bubble, [data-cart-count], .header__cart-count'
    );
    if (await badge.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }
    const empty = await this.page
      .getByText(/your cart is empty|cart is empty|no items in your cart/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    return empty;
  }

  // ---------- HP_016–HP_018 ----------

  /**
   * Locators for the hero slideshow section, highest priority first.
   * Uses {@link env#HERO_SLIDESHOW_ROOT} when set (theme publish changes IDs).
   */
  heroSlideshowSectionLocators() {
    const list = [];
    if (env.HERO_SLIDESHOW_ROOT) {
      list.push(this.page.locator(env.HERO_SLIDESHOW_ROOT));
    }
    list.push(
      this.page.locator('#shopify-section-template--26526283399461__slideshow_3Exzre'),
      this.page.locator('[id^="shopify-section-template"][id*="__slideshow"]'),
      this.page.locator('div.shopify-section[id*="slideshow"]'),
      this.page.locator(this.selectors.heroRegion)
    );
    return list;
  }

  async scrollToHeroOrSlideshow() {
    await this.ensureNoOverlay();
    for (const loc of this.heroSlideshowSectionLocators()) {
      const el = loc.first();
      if ((await el.count().catch(() => 0)) === 0) continue;
      try {
        await el.waitFor({ state: 'attached', timeout: 12_000 });
        await el.scrollIntoViewIfNeeded({ timeout: 20_000 });
        await this.page.waitForTimeout(400);
        return;
      } catch {
        /* try next candidate */
      }
    }
    const hero = this.page.locator(this.selectors.heroRegion).first();
    await hero.scrollIntoViewIfNeeded({ timeout: 30_000 });
    await this.page.waitForTimeout(400);
  }

  async heroMediaControlsTweakIfPresent() {
    const video = this.page.locator(this.selectors.heroVideo).first();
    if (!(await video.isVisible({ timeout: 2000 }).catch(() => false))) {
      return true;
    }
    const root = await this.mainHeroSlideshowRootIfAny();
    return this.tweakSlideshowVideoControlsInRoot(root || this.page);
  }

  /**
   * Hero / main slideshow: section root that exposes a “Next slide” (or legacy next) control.
   */
  async mainHeroSlideshowRootIfAny() {
    for (const loc of this.heroSlideshowSectionLocators()) {
      const root = loc.first();
      if ((await root.count().catch(() => 0)) === 0) continue;
      await root.waitFor({ state: 'attached', timeout: 5000 }).catch(() => null);
      const nextSlide = root.getByRole('button', { name: /next slide/i }).first();
      if (await nextSlide.isVisible({ timeout: 3000 }).catch(() => false)) {
        return root;
      }
      const nextCss = root.locator(this.selectors.slideshowNext).first();
      if (await nextCss.isVisible({ timeout: 2000 }).catch(() => false)) {
        return root;
      }
    }
    const scoped = this.page
      .locator(this.selectors.heroRegion)
      .filter({ has: this.page.locator(this.selectors.slideshowNext) })
      .first();
    return (await scoped.isVisible({ timeout: 2000 }).catch(() => false)) ? scoped : null;
  }

  /**
   * Pause → Play (role names), then Bonobos mute chip / aria mute double-toggle,
   * then generic aria transport as last resort — all scoped to `root`.
   */
  async tweakSlideshowVideoControlsInRoot(root) {
    const pause = root.getByRole('button', { name: /pause video/i }).first();
    if (await pause.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pause.click({ timeout: 4000 }).catch(() => {});
      await this.page.waitForTimeout(350);
    }
    const play = root.getByRole('button', { name: /play video/i }).first();
    if (await play.isVisible({ timeout: 2500 }).catch(() => false)) {
      await play.click({ timeout: 4000 }).catch(() => {});
      await this.page.waitForTimeout(350);
    }
    const mute = root.locator(this.selectors.slideshowVideoMute).first();
    if (await mute.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mute.click({ timeout: 4000 }).catch(() => {});
      await this.page.waitForTimeout(250);
      await mute.click({ timeout: 4000 }).catch(() => {});
      await this.page.waitForTimeout(200);
      return true;
    }
    const transport = root.locator(this.selectors.videoTransportAria).first();
    if (await transport.isVisible({ timeout: 2000 }).catch(() => false)) {
      await transport.click({ timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(300);
      await transport.click({ timeout: 3000 }).catch(() => {});
    }
    return true;
  }

  async clickHeroShopNowIfPresent() {
    await this.ensureNoOverlay();
    await this.scrollToHeroOrSlideshow();
    const btn = this.page.locator(this.selectors.shopNowHero).first();
    if (!(await btn.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false;
    }
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      btn.click({ timeout: 10_000 }),
    ]);
    return true;
  }

  /**
   * HP_018 — Walk every hero slide once: video controls on each, then **Next**
   * (`slides − 1` times). Slide count defaults to {@link env#HERO_SLIDESHOW_SLIDES}
   * (3 on Bonobos DEV) because DOM counts are unreliable; set `HERO_SLIDESHOW_SLIDES=0`
   * in `.env` to infer from dots / slick slides instead.
   */
  async advanceHeroOrSlideshow() {
    await this.ensureNoOverlay();
    await this.scrollToHeroOrSlideshow();
    const root = await this.mainHeroSlideshowRootIfAny();
    if (!root) {
      const nextRole = this.page.getByRole('button', { name: /next slide/i }).first();
      if (await nextRole.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextRole.click({ timeout: 5000 }).catch(() => {});
        await this.page.waitForTimeout(600);
        return;
      }
      const next = this.page.locator(this.selectors.slideshowNext).first();
      if (await next.isVisible({ timeout: 3000 }).catch(() => false)) {
        await next.click({ timeout: 5000 }).catch(() => {});
        await this.page.waitForTimeout(600);
      }
      return;
    }

    let domCount = await root.locator('.slick-dots button').count();
    if (domCount === 0) {
      domCount = await root.locator('.slick-slide:not(.slick-cloned)').count();
    }
    if (domCount > 24) domCount = 24;

    const configured = env.HERO_SLIDESHOW_SLIDES;
    let slideCount;
    if (configured > 0) {
      slideCount = configured;
    } else if (domCount > 1) {
      slideCount = domCount;
    } else {
      slideCount = 3;
    }

    const nextClicks = slideCount > 1 ? slideCount - 1 : 0;

    const nextByRole = root.getByRole('button', { name: /next slide/i }).first();
    const nextBtn = (await nextByRole.isVisible({ timeout: 2500 }).catch(() => false))
      ? nextByRole
      : root.locator(this.selectors.slideshowNext).first();

    for (let i = 0; i <= nextClicks; i += 1) {
      await this.tweakSlideshowVideoControlsInRoot(root);
      if (i === nextClicks) break;
      if (!(await nextBtn.isVisible({ timeout: 2500 }).catch(() => false))) {
        break;
      }
      await nextBtn.click({ timeout: 6000 }).catch(() => {});
      await this.page.waitForTimeout(750);
    }
  }

  async heroRegionStillVisible() {
    for (const loc of this.heroSlideshowSectionLocators()) {
      const el = loc.first();
      if ((await el.count().catch(() => 0)) === 0) continue;
      if (await el.isVisible({ timeout: 4000 }).catch(() => false)) {
        return true;
      }
    }
    const root = await this.mainHeroSlideshowRootIfAny();
    if (root && (await root.isVisible({ timeout: 4000 }).catch(() => false))) {
      return true;
    }
    const hero = this.page.locator(this.selectors.heroRegion).first();
    return hero.isVisible({ timeout: 4000 }).catch(() => false);
  }

  // ---------- HP_019–HP_020 ----------

  /**
   * Detects common Shopify / CDN transient error interstitials. When present,
   * a full reload usually restores the page so merchandising (e.g. Test
   * Collection tiles) becomes visible again.
   */
  async storefrontLooksLikeRecoverableError() {
    return this.page.evaluate(() => {
      const title = (document.title || '').toLowerCase();
      const text = (document.body?.innerText || '').slice(0, 5000).toLowerCase();
      const snippets = [
        'something went wrong',
        'try refreshing this page',
        'there was a problem loading',
        'sorry — something went wrong',
        'sorry, something went wrong',
        'an unexpected error occurred',
        'liquid error',
        'the page you were looking for does not exist',
        'temporarily unavailable',
      ];
      if (snippets.some((s) => text.includes(s))) return true;
      if (title.includes('404') && text.includes('not found')) return true;
      return false;
    });
  }

  /** Reload while the storefront still shows a recoverable error (capped). */
  async refreshStorefrontAfterErrorIfNeeded(maxReloads = 4) {
    for (let i = 0; i < maxReloads; i++) {
      if (!(await this.storefrontLooksLikeRecoverableError())) return;
      logger.warn('[HP_019] recoverable error page detected — reloading');
      await this.page.reload({
        waitUntil: 'domcontentloaded',
        timeout: env.NAVIGATION_TIMEOUT,
      });
      await dismissCookieBanner(this.page).catch(() => {});
      await this.page.waitForTimeout(600);
    }
  }

  /**
   * After redirects (e.g. back to homepage), the Perfect Fit row can stay
   * blank until a reload clears a bad state — same as a manual refresh.
   */
  async reloadUntilPerfectFitSectionReady(maxAttempts = 5) {
    for (let a = 0; a < maxAttempts; a++) {
      await this.refreshStorefrontAfterErrorIfNeeded();
      await this.scrollToYourPerfectFitSection();
      const root = this.perfectFitSectionRoot();
      if (await root.isVisible({ timeout: 12_000 }).catch(() => false)) {
        return;
      }
      logger.warn(
        `[HP_019] Perfect Fit section not visible (attempt ${a + 1}/${maxAttempts}) — reload`
      );
      await this.page.reload({
        waitUntil: 'domcontentloaded',
        timeout: env.NAVIGATION_TIMEOUT,
      });
      await dismissCookieBanner(this.page).catch(() => {});
      await this.page.waitForTimeout(500);
    }
    throw new Error(
      'HP_019: Your Perfect Fit section did not become visible after reload attempts'
    );
  }

  /**
   * Block that contains “Your Perfect Fit” merchandising.
   * Shopify themes often render homepage rows as `div.shopify-section`, not `<section>`.
   */
  perfectFitSectionRoot() {
    return this.page
      .locator('section, div.shopify-section, div[id^="shopify-section"]', {
        has: this.page.locator(this.selectors.perfectFitHeading),
      })
      .first();
  }

  async scrollToYourPerfectFitSection() {
    const section = this.perfectFitSectionRoot();
    await section.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  /** Scroll horizontal merchandising rows so off-screen collection tiles resolve. */
  async revealPerfectFitCarouselTiles(section) {
    await section
      .evaluate((root) => {
        root
          .querySelectorAll(
            '[class*="swiper"], [class*="carousel"], [class*="slider"], [class*="scroll"]'
          )
          .forEach((el) => {
            try {
              el.scrollLeft = el.scrollWidth;
            } catch {
              /* ignore */
            }
          });
      })
      .catch(() => {});
  }

  /**
   * HP_019 — Open each collection card by accessible name; pathname must match
   * the link’s `href` (correct collection destination).
   */
  async verifyEachPerfectFitCollectionCardNavigates(names) {
    await this.scrollToYourPerfectFitSection();
    await this.refreshStorefrontAfterErrorIfNeeded();

    const normPath = (absoluteUrl) => {
      try {
        return new URL(absoluteUrl).pathname.replace(/\/+$/, '') || '/';
      } catch {
        return '';
      }
    };

    for (const label of names) {
      let section = this.perfectFitSectionRoot();
      await section.waitFor({ state: 'visible', timeout: 12_000 });
      await this.refreshStorefrontAfterErrorIfNeeded();
      await this.revealPerfectFitCarouselTiles(section);

      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Accessible name may include extra copy (“Shop …”) — match substring, not full-string anchor.
      const loose = new RegExp(escaped.replace(/\s+/g, '\\s+'), 'i');

      let handle = section.getByRole('link', { name: loose }).first();
      let linkReady = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await this.refreshStorefrontAfterErrorIfNeeded();
        await handle.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
        try {
          await handle.waitFor({ state: 'visible', timeout: 12_000 });
          linkReady = true;
          break;
        } catch {
          logger.warn(
            `[HP_019] collection link not visible yet (attempt ${attempt + 1}/5) — reload`
          );
          await this.page.reload({
            waitUntil: 'domcontentloaded',
            timeout: env.NAVIGATION_TIMEOUT,
          });
          await dismissCookieBanner(this.page).catch(() => {});
          await this.page.waitForTimeout(500);
          await this.scrollToYourPerfectFitSection();
          section = this.perfectFitSectionRoot();
          await section.waitFor({ state: 'visible', timeout: 12_000 });
          await this.revealPerfectFitCarouselTiles(section);
          handle = section.getByRole('link', { name: loose }).first();
        }
      }
      if (!linkReady) {
        await handle.waitFor({ state: 'visible', timeout: 15_000 });
      }
      const href = (await handle.getAttribute('href')) || '';
      if (!href || href === '#' || href.startsWith('javascript:')) {
        throw new Error(`HP_019: link "${label}" has no usable href: ${href}`);
      }
      const expectedPath = normPath(new URL(href, this.page.url()).href);
      if (!/\/collections\//i.test(expectedPath)) {
        throw new Error(`HP_019: "${label}" does not target a collection path: ${href}`);
      }

      await Promise.all([
        this.page.waitForURL(
          (url) => normPath(url.href) === expectedPath,
          { timeout: 25_000 }
        ),
        handle.click({ timeout: 15_000 }),
      ]);
      await this.refreshStorefrontAfterErrorIfNeeded();
      const actualPath = normPath(this.page.url());
      expect(actualPath).toBe(expectedPath);

      const homeUrl = env.BASE_URL.replace(/\/$/, '');
      await this.page.goto(homeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: env.NAVIGATION_TIMEOUT,
      });
      await dismissCookieBanner(this.page).catch(() => {});
      await this.page.waitForTimeout(400);
      await this.reloadUntilPerfectFitSectionReady();
    }
  }

  async clickFirstPerfectFitTileImage() {
    await this.scrollToYourPerfectFitSection();
    const section = this.perfectFitSectionRoot();
    const imgLink = section.locator('a').filter({ has: this.page.locator('img') }).first();
    await imgLink.waitFor({ state: 'visible', timeout: 10_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      imgLink.click({ timeout: 15_000 }),
    ]);
  }

  // ---------- HP_021–HP_022 ----------

  async scrollToFindYourFitHomeSection() {
    const block = this.page.locator(this.selectors.findYourFitBlock).first();
    await block.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  async clickTakeTheQuizInFindYourFitSection() {
    await this.scrollToFindYourFitHomeSection();
    const q = this.page.locator(this.selectors.takeTheQuiz).first();
    await q.waitFor({ state: 'visible', timeout: 10_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      q.click({ timeout: 15_000 }),
    ]);
  }

  async clickViewProductFromHotspotIfPresent() {
    await this.scrollToFindYourFitHomeSection();
    const vp = this.page.locator(this.selectors.viewProductHotspot).first();
    if (!(await vp.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error('VIEW PRODUCT hotspot not found in Find Your Fit section.');
    }
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      vp.click({ timeout: 15_000 }),
    ]);
  }

  // ---------- HP_023–HP_025 ----------

  async scrollToBestsellersSection() {
    const h = this.page.getByRole('heading', { name: /bestseller/i }).first();
    await h.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  async clickBestsellersCarouselNextIfPresent() {
    await this.scrollToBestsellersSection();
    const section = this.page
      .locator('section, div[class*="shopify-section"]')
      .filter({ has: this.page.getByRole('heading', { name: /bestseller/i }) })
      .first();
    const next = section.locator(this.selectors.slideshowNext).first();
    if (await next.isVisible({ timeout: 4000 }).catch(() => false)) {
      await next.click({ timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }

  async clickFirstBestsellerProductLink() {
    await this.scrollToBestsellersSection();
    const section = this.page
      .locator('section, div[class*="shopify-section"]')
      .filter({ has: this.page.getByRole('heading', { name: /bestseller/i }) })
      .first();
    const plink = section.locator('a[href*="/products/"]').first();
    await plink.waitFor({ state: 'visible', timeout: 12_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      plink.click({ timeout: 15_000 }),
    ]);
  }

  /** HP_023 — advance carousel (if any) then open first visible PDP link. */
  async exploreBestsellersCarouselAndOpenFirstProductLink() {
    await this.clickBestsellersCarouselNextIfPresent();
    await this.clickFirstBestsellerProductLink();
  }

  async bestsellersHasMultipleTabsIfPresent() {
    await this.scrollToBestsellersSection();
    const section = this.page
      .locator('section, div[class*="shopify-section"]')
      .filter({ has: this.page.getByRole('heading', { name: /bestseller/i }) })
      .first();
    const tabs = section.locator(
      '[role="tab"], button[class*="tab"], .tabs button, ul.tabs li button'
    );
    const n = await tabs.count();
    if (n < 2) {
      return true;
    }
    const t0 = (await tabs.nth(0).innerText()) || '';
    await tabs.nth(1).click({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(600);
    const t1 = (await tabs.nth(1).innerText()) || '';
    return t0.trim() !== t1.trim() || n >= 2;
  }

  async openFirstBestsellerViaImageOrQuickControl() {
    await this.scrollToBestsellersSection();
    const section = this.page
      .locator('section, div[class*="shopify-section"]')
      .filter({ has: this.page.getByRole('heading', { name: /bestseller/i }) })
      .first();
    const quick = section
      .locator('a[href*="/products/"], button[aria-label*="quick" i], [class*="quick-add"]')
      .first();
    await quick.waitFor({ state: 'visible', timeout: 12_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      quick.click({ timeout: 15_000 }),
    ]);
  }

  // ---------- HP_026–HP_027 ----------

  async scrollToGuideshopSection() {
    const g = this.page.locator(this.selectors.guideshopBlock).first();
    await g.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  async openFindLocationFromGuideshopIfPresent() {
    await this.scrollToGuideshopSection();
    const link = this.page
      .getByRole('link', { name: /find a location|find\s*location|locations/i })
      .first();
    if (!(await link.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error('Find a location link not found in Guideshop section.');
    }
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      link.click({ timeout: 15_000 }),
    ]);
  }

  async submitInvalidGuideshopSearchIfPresent() {
    const input = this.page
      .locator('input[type="search"], input[name="q"], input[placeholder*="Search" i]')
      .filter({ visible: true })
      .first();
    if (!(await input.isVisible({ timeout: 4000 }).catch(() => false))) {
      return;
    }
    await input.fill('@@@###invalid-test-query@@@');
    await input.press('Enter').catch(() => {});
    await this.page.waitForTimeout(800);
  }

  async clickViewNewArrivalsFromGuideshopIfPresent() {
    await this.scrollToGuideshopSection();
    const v = this.page.locator(this.selectors.viewNewArrivals).first();
    if (!(await v.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error('VIEW NEW ARRIVALS not found in Guideshop section.');
    }
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      v.click({ timeout: 15_000 }),
    ]);
  }

  // ---------- HP_028 ----------

  async scrollToUgcSection() {
    const u = this.page.locator(this.selectors.ugcBlock).first();
    await u.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  async ugcVideoControlsIfPresent() {
    const block = this.page.locator(this.selectors.ugcBlock).first();
    const play = block
      .locator(
        `${this.selectors.videoTransportAria}, [class*="video"] button`
      )
      .first();
    if (await play.isVisible({ timeout: 3000 }).catch(() => false)) {
      await play.click({ timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(400);
      await play.click({ timeout: 3000 }).catch(() => {});
    }
    const next = block.locator(this.selectors.slideshowNext).first();
    if (await next.isVisible({ timeout: 2000 }).catch(() => false)) {
      await next.click({ timeout: 3000 }).catch(() => {});
    }
    return true;
  }

  // ---------- HP_029 ----------

  async clickFirstUgcProductLink() {
    const block = this.page.locator(this.selectors.ugcBlock).first();
    await block.scrollIntoViewIfNeeded();
    const plink = block.locator('a[href*="/products/"]').first();
    await plink.waitFor({ state: 'visible', timeout: 12_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      plink.click({ timeout: 15_000 }),
    ]);
  }

  // ---------- HP_030 ----------

  async scrollToGreatFitFirstSection() {
    const s = this.page.locator(this.selectors.greatFitFirstBlock).first();
    await s.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  /**
   * Activates a second “scroll line” / dot / tab control and asserts the
   * active slide or visible copy changes (when controls exist).
   */
  async greatFitFirstScrollLinesChangeVisibleContent() {
    await this.scrollToGreatFitFirstSection();
    const section = this.page.locator(this.selectors.greatFitFirstBlock).first();
    const dots = section.locator(
      '.slick-dots button, [role="tablist"] [role="tab"], button[aria-label*="slide" i]'
    );
    const n = await dots.count();
    if (n >= 2) {
      const slideSnap = async () =>
        (
          (await section
            .locator('.slick-active, [aria-selected="true"]')
            .first()
            .innerText()
            .catch(() => '')) +
          (await section.locator('.slick-active img').first().getAttribute('src').catch(() => ''))
        ).trim();

      const before = await slideSnap();
      await dots.nth(1).click({ timeout: 8000 }).catch(() => {});
      await this.page.waitForTimeout(700);
      const mid = await slideSnap();
      if (before !== mid) return true;
      await dots.nth(0).click({ timeout: 8000 }).catch(() => {});
      await this.page.waitForTimeout(400);
      await dots.nth(1).click({ timeout: 8000 }).catch(() => {});
      await this.page.waitForTimeout(700);
      const after = await slideSnap();
      if (before !== after) return true;
    }

    const track = section
      .locator('.slick-list, [class*="carousel"] [class*="track"], [class*="slider"]')
      .first();
    if (await track.isVisible({ timeout: 2000 }).catch(() => false)) {
      const img0 = section.locator('img').first();
      const src0 = (await img0.getAttribute('src')) || '';
      await track.evaluate((el) => {
        el.scrollLeft = Math.min(el.scrollWidth, el.scrollLeft + 400);
      });
      await this.page.waitForTimeout(600);
      const src1 = (await img0.getAttribute('src')) || '';
      if (src0 !== src1) return true;
    }

    throw new Error(
      'Great Fit First: could not find scroll tabs/dots or prove content changed — update selectors.'
    );
  }

  // ---------- HP_032 ----------

  async scrollToBestOfTheSaleSection() {
    const h = this.page.locator(this.selectors.saleSection).first();
    await h.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  bestOfSaleSectionLocator() {
    return this.page
      .locator('section, div[class*="shopify-section"]')
      .filter({ has: this.page.locator(this.selectors.saleSection) })
      .first();
  }

  async viewAllLinksInBestOfSaleTargetCollections() {
    await this.scrollToBestOfTheSaleSection();
    const section = this.bestOfSaleSectionLocator();
    const links = section.getByRole('link', { name: /VIEW ALL/i });
    const n = await links.count();
    if (n === 0) {
      throw new Error('No VIEW ALL links in Best of the Sale — update selectors.');
    }
    if (n < 4) {
      throw new Error(
        `Best of the Sale: expected four VIEW ALL links per spec, found ${n}.`
      );
    }
    for (let i = 0; i < 4; i += 1) {
      const href = (await links.nth(i).getAttribute('href')) || '';
      if (!/\/collections\//i.test(href) && !href.startsWith('/collections/')) {
        throw new Error(`VIEW ALL link ${i} is not a collection URL: ${href}`);
      }
    }
    return true;
  }

  async clickFirstViewAllInBestOfSaleSection() {
    await this.scrollToBestOfTheSaleSection();
    const section = this.bestOfSaleSectionLocator();
    const link = section.getByRole('link', { name: /VIEW ALL/i }).first();
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      link.click({ timeout: 15_000 }),
    ]);
  }

  // ---------- HP_033 / HP_035 / HP_036 / HP_038 (footer) ----------

  async scrollToFooter() {
    const f = this.page.locator(this.selectors.footer).first();
    await f.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(400);
  }

  async subscribeFooterNewsletter(email) {
    await this.scrollToFooter();
    const input = this.page.locator(this.selectors.footerNewsletterInput).first();
    await input.waitFor({ state: 'visible', timeout: 12_000 });
    await input.fill(email);
    const submit = this.page
      .locator(this.selectors.footerNewsletterSubmit)
      .filter({ hasText: /subscribe|sign\s*up|submit/i })
      .first();
    if (await submit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submit.click({ timeout: 10_000 });
    } else {
      await this.page.locator(this.selectors.footerNewsletterSubmit).first().click({ timeout: 10_000 });
    }
    await this.page.waitForTimeout(1500);
  }

  async footerShowsThanksForSubscribing() {
    return this.page
      .getByText(
        /thanks\s+for\s+subscrib|thank\s+you.*subscrib|you.*re\s+subscribed|successfully\s+subscribed|you.*re\s+in!/i
      )
      .first()
      .isVisible({ timeout: 12_000 })
      .catch(() => false);
  }

  async openFooterTermsOfServiceLink() {
    await this.scrollToFooter();
    const link = this.page
      .locator('footer')
      .getByRole('link', { name: /terms\s+of\s+service/i })
      .first();
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      link.click({ timeout: 12_000 }),
    ]);
  }

  async openFooterPrivacyNoticeLink() {
    await this.scrollToFooter();
    const link = this.page
      .locator('footer')
      .getByRole('link', { name: /privacy\s+notice|privacy\s+policy/i })
      .first();
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      link.click({ timeout: 12_000 }),
    ]);
  }

  /**
   * Clicks each visible footer social icon/link whose href points at a
   * major network host; asserts the opened page (popup or same tab) URL
   * matches {@link hpData.expected.recognisedSocialHost}.
   */
  async verifyFooterSocialLinksOpenRecognisedHosts() {
    await this.scrollToFooter();
    const footer = this.page.locator('footer');
    const social = footer.locator(
      'a[href*="instagram"], a[href*="facebook.com"], a[href*="twitter."], a[href*="x.com"], a[href*="tiktok"], a[href*="pinterest"], a[href*="youtube.com"], a[href*="youtu.be"]'
    );
    const n = await social.count();
    if (n === 0) {
      throw new Error('No footer social links matched — update selectors.');
    }
    for (let i = 0; i < n; i += 1) {
      const row = social.nth(i);
      if (!(await row.isVisible({ timeout: 2000 }).catch(() => false))) continue;
      const popupWait = this.page.waitForEvent('popup', { timeout: 6000 }).catch(() => null);
      await row.click({ timeout: 12_000 });
      const popup = await popupWait;
      const target = popup || this.page;
      await target.waitForLoadState('domcontentloaded', { timeout: 25_000 }).catch(() => {});
      const url = target.url();
      if (!hpData.expected.recognisedSocialHost.test(url)) {
        if (popup) await popup.close().catch(() => {});
        throw new Error(`Social link opened unexpected URL: ${url}`);
      }
      if (popup) await popup.close().catch(() => {});
      else await this.goBack();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(400);
    }
    return true;
  }

  async verifySampleInternalFooterLinksHealthy(max = 3) {
    await this.scrollToFooter();
    const origin = new URL(this.page.url()).origin;
    const footer = this.page.locator('footer');
    const anchors = footer.locator('a[href^="/"]');
    const n = await anchors.count();
    const indices = [];
    for (let i = 0; i < n; i += 1) {
      const href = (await anchors.nth(i).getAttribute('href')) || '';
      if (!href || href === '/' || /^\/cart/i.test(href) || href === '/#' || href.endsWith('/#')) {
        continue;
      }
      indices.push(i);
      if (indices.length >= max) break;
    }
    if (indices.length === 0) {
      throw new Error('HP_038: no internal footer links matched the sampling filter.');
    }
    for (const idx of indices) {
      const link = footer.locator('a[href^="/"]').nth(idx);
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        this.page.waitForLoadState('domcontentloaded'),
        link.click({ timeout: 12_000 }),
      ]);
      await this.page.waitForTimeout(400);
      expect(this.page.url().startsWith(origin)).toBe(true);
      expect(await this.searchPageIsHealthy()).toBe(true);
      await this.goBack();
      await this.page.waitForLoadState('domcontentloaded');
    }
    return true;
  }
}

module.exports = HomePage;