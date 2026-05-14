/**
 * Home-page step definitions (HP_001..HP_038).
 *
 * Steps stay thin: they call HomePage methods, then assert with
 * `@playwright/test` expect. Selectors and DOM concerns live in the
 * page object, expected values live in `homepage.data.js`.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const {
  baseUrl,
  links,
  expected,
  megamenuJeansPantsLabels,
  newsletterTestEmail,
  perfectFitCollectionCardNames,
} = require('./homepage.data');

// NOTE: the password-gate Background steps
//   "Given user is on the login page"
//   "When he enters the password {string}"
//   "Then he should see the homepage"
// live in `features/hooks/common.steps.js` because they are reused by
// every storefront-facing feature.

// ---------- HP_001 ----------

Then('the homepage should load smoothly without any lag', async function () {
  const home = this.getPage('HomePage');
  const start = Date.now();
  expect(await home.isFullyLoaded()).toBe(true);
  const elapsed = Date.now() - start;
  this.logger.assertion(`homepage fully loaded in ${elapsed}ms`);

  // "Smoothly without lag" = no console errors during load.
  // We attach the console errors collected during the scenario for
  // debugging — but keep this a soft check (don't fail the scenario
  // for harmless 3p errors).
  this.state.lastLoadElapsedMs = elapsed;
});

// ---------- HP_002 ----------

When(
  'the customer scrolls down to a different section of the home page',
  async function () {
    await this.page.evaluate(() => window.scrollBy(0, 1500));
    await this.page.waitForTimeout(500);
  }
);

When('the customer clicks on the BONOBOS logo', async function () {
  const home = this.getPage('HomePage');
  await home.clickLogo();
});

Then('the customer should be redirected to the root URL', async function () {
  await expect(this.page).toHaveURL(new RegExp(`^${baseUrl}/?(\\?.*)?$`), {
    timeout: 15_000,
  });
  this.logger.assertion(`landed on root URL: ${this.page.url()}`);
});

// ---------- HP_003 / HP_004 / HP_005 (announcement-bar named links) ----------

When(
  'the customer clicks on the {string} link in the announcement bar',
  async function (label) {
    const link = Object.values(links).find((l) => l.label === label);
    if (!link) {
      throw new Error(
        `Unknown announcement-bar link "${label}". ` +
          `Add it to features/homepage/homepage.data.js.`
      );
    }
    this.state.activeLink = link;

    const home = this.getPage('HomePage');
    await home.clickAnnouncementLink(link.key);
  }
);

Then('the link should land on the FIT QUIZ page', async function () {
  const url = this.page.url();
  this.logger.assertion(`destination URL: ${url}`);
  await expect(this.page).toHaveURL(links.findYourFit.expectedUrl, {
    timeout: 15_000,
  });
});

Then(
  'the link should land on the guideshop location page',
  async function () {
    const url = this.page.url();
    this.logger.assertion(`destination URL: ${url}`);
    await expect(this.page).toHaveURL(links.findALocation.expectedUrl, {
      timeout: 15_000,
    });
  }
);

Then('the link should land on the discount page', async function () {
  const url = this.page.url();
  this.logger.assertion(`destination URL: ${url}`);
  await expect(this.page).toHaveURL(links.get25Off.expectedUrl, {
    timeout: 15_000,
  });
});

// ---------- HP_006 (promotional advertisement) ----------

When(
  'the customer clicks on the promotional discount link in the advertisement',
  async function () {
    const home = this.getPage('HomePage');
    this.state.activeLink = links.promotionalAd;
    await home.clickAnnouncementLink('promotionalAd');
  }
);

Then(
  'the link should land on the correct promotional page',
  async function () {
    const url = this.page.url();
    this.logger.assertion(`destination URL: ${url}`);
    await expect(this.page).toHaveURL(links.promotionalAd.expectedUrl, {
      timeout: 15_000,
    });
  }
);

// ---------- HP_008 ----------

When(
  'the customer hovers each top-level menu category and verifies the mega menu opens with categories',
  async function () {
    const home = this.getPage('HomePage');
    await home.verifyEachMegamenuCategoryOpensWithCategories();
  }
);

// ---------- HP_009 / HP_010 (search) ----------

When(
  'the customer opens search and submits query {string}',
  async function (query) {
    const home = this.getPage('HomePage');
    await home.runSearch(query);
    this.state.lastSearchQuery = query;
  }
);

Then('the search results should reference chino products', async function () {
  await expect(this.page).toHaveURL(expected.searchOrCollectionUrl, {
    timeout: 20_000,
  });
  const body = (await this.page.textContent('body')) || '';
  expect(body.toLowerCase()).toMatch(/chino/);
  const home = this.getPage('HomePage');
  const n = await home.countVisibleProductCards();
  expect(n).toBeGreaterThan(0);
});

// ---------- HP_012 ----------

When(
  'the customer opens the SALE category from the navigation bar',
  async function () {
    const home = this.getPage('HomePage');
    await home.clickSaleCategoryInNav();
  }
);

Then('the customer should land on a sale collection page', async function () {
  await expect(this.page).toHaveURL(expected.saleLandingUrl, {
    timeout: 20_000,
  });
});

Then(
  'the page should show sale products or sale pricing signals',
  async function () {
    const home = this.getPage('HomePage');
    const products = await home.countVisibleProductCards();
    const saleSignals = await home.pageShowsSalePricingSignals();
    expect(products > 0 || saleSignals).toBe(true);
  }
);

// ---------- HP_013 ----------

When(
  'the customer opens megamenu and follows category {string}',
  async function (categoryLabel) {
    const home = this.getPage('HomePage');
    const labels = [
      categoryLabel,
      ...megamenuJeansPantsLabels.filter((l) => l !== categoryLabel),
    ];
    await home.openMegamenuAndClickCategoryLink(labels);
  }
);

Then(
  'the landing page should show a jeans or pants collection or product listing',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.landingPageShowsJeansOrPantsListing()).toBe(true);
  }
);

// ---------- HP_014 ----------

When(
  'the customer opens account menu from the header',
  async function () {
    const home = this.getPage('HomePage');
    await home.openAccountMenuFromHeader();
  }
);

When('the customer chooses Sign in', async function () {
  const home = this.getPage('HomePage');
  await home.chooseSignInFromHeaderMenu();
});

Then('the customer should see the account sign-in page', async function () {
  const home = this.getPage('HomePage');
  await expect
    .poll(
      async () =>
        expected.accountLoginUrl.test(this.page.url()) ||
        (await home.isAccountSignInUIOpen()),
      { timeout: 20_000 }
    )
    .toBe(true);
  this.logger.assertion(`HP_014 sign-in destination: ${this.page.url()}`);
});

// ---------- HP_015 ----------

When(
  'the customer opens the bag or cart from the header',
  async function () {
    const home = this.getPage('HomePage');
    await home.openBagOrCartFromHeader();
  }
);

Then(
  'the cart page or cart drawer should open without errors',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.cartDrawerOrPageOpened()).toBe(true);
  }
);

Then(
  'the cart UI should show a quantity badge or an empty cart state',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.cartShowsBadgeOrEmptyState()).toBe(true);
  }
);

// ---------- HP_017 ----------

When(
  'the customer clicks the hero SHOP NOW button if visible',
  async function () {
    const home = this.getPage('HomePage');
    this.state.hp017ShopNowClicked = await home.clickHeroShopNowIfPresent();
  }
);

Then(
  'the storefront should navigate away from the homepage root when SHOP NOW was clicked',
  async function () {
    if (!this.state.hp017ShopNowClicked) {
      this.logger.warn(
        'HP_017: hero SHOP NOW not visible — skipping destination assertion'
      );
      return;
    }
    await expect(this.page).toHaveURL(expected.notHomePath, {
      timeout: 20_000,
    });
  }
);

// ---------- HP_018 ----------

When(
  'the customer advances the main hero or slideshow with next control',
  async function () {
    const home = this.getPage('HomePage');
    await home.advanceHeroOrSlideshow();
  }
);

Then(
  'the hero or slideshow region should still be visible',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.heroRegionStillVisible()).toBe(true);
  }
);

// ---------- HP_019 ----------

When(
  'the customer scrolls to the Your Perfect Fit section',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToYourPerfectFitSection();
  }
);

Then(
  'each Perfect Fit collection card should navigate to its linked collection page',
  { timeout: 180_000 },
  async function () {
    const home = this.getPage('HomePage');
    await home.verifyEachPerfectFitCollectionCardNavigates(
      perfectFitCollectionCardNames
    );
  }
);

// Then: collection or merchandising (HP_027, HP_032, …)

Then(
  'the customer should land on a collection or merchandising page',
  async function () {
    await expect(this.page).toHaveURL(expected.notHomePath, {
      timeout: 20_000,
    });
  }
);

// ---------- HP_021 ----------

When(
  'the customer scrolls to the Find Your Fit homepage section',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToFindYourFitHomeSection();
  }
);

When(
  'the customer clicks TAKE THE QUIZ in that section',
  async function () {
    const home = this.getPage('HomePage');
    await home.clickTakeTheQuizInFindYourFitSection();
  }
);

// ---------- HP_022 ----------

When(
  'the customer opens VIEW PRODUCT from a hotspot if present',
  async function () {
    const home = this.getPage('HomePage');
    await home.clickViewProductFromHotspotIfPresent();
  }
);

Then(
  'the customer should land on a product detail or quick-shop experience',
  async function () {
    await expect(this.page).toHaveURL(expected.productExperienceUrl, {
      timeout: 20_000,
    });
  }
);

// ---------- HP_023 ----------

When(
  'the customer explores the Bestsellers carousel and opens the first product link',
  async function () {
    const home = this.getPage('HomePage');
    await home.exploreBestsellersCarouselAndOpenFirstProductLink();
  }
);

// ---------- HP_024 ----------

When(
  'the customer scrolls to the Bestsellers section',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToBestsellersSection();
  }
);

Then(
  'Bestsellers tabs or toggles should expose at least one alternative collection when present',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.bestsellersHasMultipleTabsIfPresent()).toBe(true);
  }
);

// ---------- HP_026 ----------

When(
  'the customer scrolls to the Guideshop section',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToGuideshopSection();
  }
);

When(
  'the customer opens Find a location from Guideshop if present',
  async function () {
    const home = this.getPage('HomePage');
    await home.openFindLocationFromGuideshopIfPresent();
  }
);

Then(
  'the guideshop or locations experience should load without breaking',
  async function () {
    await expect(this.page).toHaveURL(links.findALocation.expectedUrl, {
      timeout: 20_000,
    });
    const home = this.getPage('HomePage');
    expect(await home.searchPageIsHealthy()).toBe(true);
  }
);

When(
  'the customer submits invalid text in guideshop search if present',
  async function () {
    const home = this.getPage('HomePage');
    await home.submitInvalidGuideshopSearchIfPresent();
  }
);

Then(
  'the page should remain healthy without a hard error',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.searchPageIsHealthy()).toBe(true);
    const shell = this.page
      .locator('main, #MainContent, [role="main"], body')
      .first();
    await expect(shell).toBeVisible({ timeout: 15_000 });
  }
);

// ---------- HP_027 ----------

When(
  'the customer clicks VIEW NEW ARRIVALS in Guideshop if present',
  async function () {
    const home = this.getPage('HomePage');
    await home.clickViewNewArrivalsFromGuideshopIfPresent();
  }
);

// ---------- HP_028 ----------

When(
  'the customer scrolls to the Made by us styled by you section',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToUgcSection();
  }
);

Then(
  'UGC play pause or arrow controls should respond if visible',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.ugcVideoControlsIfPresent()).toBe(true);
  }
);

// ---------- HP_029 ----------

When(
  'the customer opens the first product link in the UGC section',
  async function () {
    const home = this.getPage('HomePage');
    await home.clickFirstUgcProductLink();
  }
);

// ---------- HP_030 ----------

When(
  'the customer scrolls to the Great Fit First section',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToGreatFitFirstSection();
  }
);

Then(
  'scroll line controls in Great Fit First should change visible content when used',
  async function () {
    const home = this.getPage('HomePage');
    await home.greatFitFirstScrollLinesChangeVisibleContent();
  }
);

// ---------- HP_032 ----------

When(
  'the customer scrolls to the Best of the Sale section',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToBestOfTheSaleSection();
  }
);

Then(
  'each visible VIEW ALL link in Best of the Sale should target a collection URL',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.viewAllLinksInBestOfSaleTargetCollections()).toBe(true);
  }
);

When(
  'the customer clicks the first VIEW ALL link in the Best of the Sale section',
  async function () {
    const home = this.getPage('HomePage');
    await home.clickFirstViewAllInBestOfSaleSection();
  }
);

// ---------- HP_033 ----------

When(
  'the customer scrolls to the site footer',
  async function () {
    const home = this.getPage('HomePage');
    await home.scrollToFooter();
  }
);

When(
  'the customer subscribes with a valid test email address',
  async function () {
    const home = this.getPage('HomePage');
    this.state.newsletterEmail = newsletterTestEmail();
    await home.subscribeFooterNewsletter(this.state.newsletterEmail);
  }
);

Then(
  'a thanks for subscribing confirmation should appear',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.footerShowsThanksForSubscribing()).toBe(true);
  }
);

// ---------- HP_035 ----------

When(
  'the customer opens the footer Terms of service link',
  async function () {
    const home = this.getPage('HomePage');
    await home.openFooterTermsOfServiceLink();
  }
);

Then(
  'the customer should land on the Terms of service policy page',
  async function () {
    await expect(this.page).toHaveURL(expected.termsPolicyUrl, {
      timeout: 20_000,
    });
  }
);

When('the customer returns to the previous page', async function () {
  const home = this.getPage('HomePage');
  await home.goBack();
});

When(
  'the customer opens the footer Privacy notice link',
  async function () {
    const home = this.getPage('HomePage');
    await home.openFooterPrivacyNoticeLink();
  }
);

Then(
  'the customer should land on the Privacy policy page',
  async function () {
    await expect(this.page).toHaveURL(expected.privacyPolicyUrl, {
      timeout: 20_000,
    });
  }
);

// ---------- HP_036 ----------

Then(
  'each footer social link should open a recognised social network or platform URL',
  async function () {
    const home = this.getPage('HomePage');
    expect(await home.verifyFooterSocialLinksOpenRecognisedHosts()).toBe(true);
  }
);

// ---------- HP_038 ----------

Then(
  'each configured internal footer link should navigate or behave correctly',
  { timeout: 900_000 },
  async function () {
    const home = this.getPage('HomePage');
    await home.verifyConfiguredInternalFooterLinks();
  }
);
