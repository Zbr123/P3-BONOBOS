@homepage
Feature: Bonobos DEV — Home Page (HP_001..HP_038)

  As a customer visiting the Bonobos DEV storefront
  I want the homepage, announcement bar, navigation, mega menu,
  search, account, cart, banners, and merchandising sections to behave
  correctly so I can browse and shop with confidence.

  Background:
    Given user is on the login page
    When he enters the password "sifrah"
    Then he should see the homepage

  @smoke @high @HP_001
  Scenario: HP_001 — Verify loading of homepage in Chrome browser
    Then the homepage should load smoothly without any lag
    And the page title should contain "Bonobos"
    And the URL should contain "bonobos-dev-3.myshopify.com"

  @smoke @high @HP_002
  Scenario: HP_002 — Verify BONOBOS logo redirects to the root URL
    When the customer scrolls down to a different section of the home page
    And the customer clicks on the BONOBOS logo
    Then the customer should be redirected to the root URL

  @regression @high @HP_003
  Scenario: HP_003 — Verify FIND YOUR FIT link in announcement bar
    When the customer clicks on the "FIND YOUR FIT" link in the announcement bar
    Then the link should land on the FIT QUIZ page

  @regression @high @HP_004
  Scenario: HP_004 — Verify FIND A LOCATION link in announcement bar
    When the customer clicks on the "FIND A LOCATION" link in the announcement bar
    Then the link should land on the guideshop location page

  @regression @high @HP_005
  Scenario: HP_005 — Verify 25% off link in announcement bar
    When the customer clicks on the "GET 25% OFF" link in the announcement bar
    Then the link should land on the discount page

  @regression @high @HP_006
  Scenario: HP_006 — Verify Promotional discount link in the advertisement
    When the customer clicks on the promotional discount link in the advertisement
    Then the link should land on the correct promotional page

  @regression @high @HP_008
  Scenario: HP_008 — Verify megamenu opens with categories for each top-level menu item
    When the customer hovers each top-level menu category and verifies the mega menu opens with categories

  @regression @high @HP_010
  Scenario: HP_010 — Verify search bar with valid keyword entry
    When the customer opens search and submits query "Chinos"
    Then the search results should reference chino products

  @regression @high @HP_012
  Scenario: HP_012 — Verify Sale category tab
    When the customer opens the SALE category from the navigation bar
    Then the customer should land on a sale collection page
    And the page should show sale products or sale pricing signals

  @regression @high @HP_013
  Scenario: HP_013 — Mega menu category link opens PLP (Jeans & Pants)
    When the customer opens megamenu and follows category "All New Jeans & Pants"
    Then the landing page should show a jeans or pants collection or product listing

  @regression @high @HP_014
  Scenario: HP_014 — Cold user Sign In from header
    When the customer opens account menu from the header
    And the customer chooses Sign in
    Then the customer should see the account sign-in page

  @regression @high @HP_015
  Scenario: HP_015 — Bag icon opens cart or drawer
    When the customer opens the bag or cart from the header
    Then the cart page or cart drawer should open without errors
    And the cart UI should show a quantity badge or an empty cart state

  @regression @high @HP_017
  Scenario: HP_017 — Hero SHOP NOW navigates
    When the customer clicks the hero SHOP NOW button if visible
    Then the storefront should navigate away from the homepage root when SHOP NOW was clicked

  @regression @high @HP_018
  Scenario: HP_018 — Hero slideshow: every slide, next, pause/play, mute
    When the customer advances the main hero or slideshow with next control
    Then the hero or slideshow region should still be visible

  @regression @high @HP_019
  Scenario: HP_019 — Your Perfect Fit collection cards open correct collection URLs
    When the customer scrolls to the Your Perfect Fit section
    Then each Perfect Fit collection card should navigate to its linked collection page

  @regression @high @HP_021
  Scenario: HP_021 — Find Your Fit TAKE THE QUIZ on homepage
    When the customer scrolls to the Find Your Fit homepage section
    And the customer clicks TAKE THE QUIZ in that section
    Then the link should land on the FIT QUIZ page

  @regression @high @HP_022
  Scenario: HP_022 — Find Your Fit hotspot VIEW PRODUCT to PDP
    When the customer scrolls to the Find Your Fit homepage section
    And the customer opens VIEW PRODUCT from a hotspot if present
    Then the customer should land on a product detail or quick-shop experience

  @regression @high @HP_023
  Scenario: HP_023 — Bestsellers carousel navigation and product links
    When the customer explores the Bestsellers carousel and opens the first product link
    Then the customer should land on a product detail or quick-shop experience

  @regression @high @HP_024
  Scenario: HP_024 — Bestsellers tabs show different collections
    When the customer scrolls to the Bestsellers section
    Then Bestsellers tabs or toggles should expose at least one alternative collection when present

  @regression @high @HP_026
  Scenario: HP_026 — Guideshop Find a location and invalid search
    When the customer scrolls to the Guideshop section
    And the customer opens Find a location from Guideshop if present
    Then the guideshop or locations experience should load without breaking
    And the customer submits invalid text in guideshop search if present
    And the page should remain healthy without a hard error

  @regression @high @HP_027
  Scenario: HP_027 — Guideshop VIEW NEW ARRIVALS
    When the customer scrolls to the Guideshop section
    And the customer clicks VIEW NEW ARRIVALS in Guideshop if present
    Then the customer should land on a collection or merchandising page

  @regression @high @HP_028
  Scenario: HP_028 — UGC strip video controls if present
    When the customer scrolls to the Made by us styled by you section
    Then UGC play pause or arrow controls should respond if visible

  @regression @high @HP_029
  Scenario: HP_029 — UGC product link opens PDP
    When the customer scrolls to the Made by us styled by you section
    And the customer opens the first product link in the UGC section
    Then the customer should land on a product detail or quick-shop experience

  @regression @high @HP_030
  Scenario: HP_030 — Great Fit First section scroll lines cycle content
    When the customer scrolls to the Great Fit First section
    Then scroll line controls in Great Fit First should change visible content when used

  @regression @high @HP_032
  Scenario: HP_032 — Best of the Sale collections and VIEW ALL
    When the customer scrolls to the Best of the Sale section
    Then each visible VIEW ALL link in Best of the Sale should target a collection URL
    When the customer clicks the first VIEW ALL link in the Best of the Sale section
    Then the customer should land on a collection or merchandising page

  @regression @high @HP_033
  Scenario: HP_033 — Footer newsletter with valid email
    When the customer scrolls to the site footer
    And the customer subscribes with a valid test email address
    Then a thanks for subscribing confirmation should appear

  @regression @high @HP_035
  Scenario: HP_035 — Footer Terms and Privacy links
    When the customer scrolls to the site footer
    And the customer opens the footer Terms of service link
    Then the customer should land on the Terms of service policy page
    When the customer returns to the previous page
    And the customer opens the footer Privacy notice link
    Then the customer should land on the Privacy policy page

  @regression @high @HP_036
  Scenario: HP_036 — Footer social media links reach recognised networks
    When the customer scrolls to the site footer
    Then each footer social link should open a recognised social network or platform URL

  @regression @high @HP_038
  Scenario: HP_038 — Footer internal links navigate without errors
    When the customer scrolls to the site footer
    Then each configured internal footer link should navigate or behave correctly
