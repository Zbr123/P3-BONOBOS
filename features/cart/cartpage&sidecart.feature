@cart
Feature: Bonobos DEV — Cart page & side cart

  Background:
    Given user is on the login page
    When he enters the password "sifrah"
    Then he should see the homepage



  @regression @high @CP_001
  Scenario: CP_001 — Verify loading of Cart page in Chrome browser
    When the customer clicks on any product on the home page and adds it to the cart
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the cart page should load fast and smooth without lagging when the bag icon is used

  @regression @high @CP_002
  Scenario: CP_002 — Verify products and quantities in cart
    When the customer adds a few products to the cart from the storefront
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the cart page should show correct product details images and quantities for the items added
    And the bag icon should show the correct product count
  
  @regression @high @CP_003
  Scenario: CP_003 — Verify decrease/increase quantity for multiple items
    When the customer adds a few products to the cart from the storefront
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the customer should be allowed to increase and decrease quantity for line items in the cart

  @regression @high @CP_004
  Scenario: CP_004 — Verify items in the cart to be removed
    When the customer adds a few products to the cart from the storefront
    When the customer clicks on the bag icon on the Home Page to open the cart page
    When the customer removes all items from the cart using remove until the cart is empty
    Then the item should be removed from the cart

  @regression @high @CP_005
  Scenario: CP_005 — Verify edit and update the cart
    When the customer adds a few products to the cart from the storefront
    When the customer clicks on the bag icon on the Home Page to open the cart page
    When the customer clicks on edit for the Wool Blend Sweater Bomber in the cart
    When the customer selects size "S" on the product detail page opened from the cart
    When the customer clicks on Update Bag
    Then the cart should remain usable after update

  @regression @high @CP_006
  Scenario: CP_006 — Verify "Your Cart is empty" - Shop Pants, Shop Shirts, Shop New Apprivals, Shop Suits & Blazers
    When the customer clicks on the bag icon on the Home Page to open the cart page
    And each empty-cart category link should navigate correctly using the CP_006 recorded locators
 
  @regression @high @CP_007
  Scenario: CP_007 — Start with these on empty cart, ADD TO BAG, and PDP from product link or image
    When the customer adds a few products to the cart from the storefront
    When the customer opens the cart using the bag drawer trigger
    When the customer removes all items from the cart using remove until the cart is empty
    Then the customer should see Your Cart is empty in the cart drawer
    And Start with these should appear with product details and links
    When the customer clicks ADD TO BAG on the first product in Start with these
    Then the cart should contain at least one line item after a recommendation add
    When the customer opens the cart using the bag drawer trigger
    When the customer clicks the product image or product link in the cart line item to open the PDP
    Then the customer should be on a product detail page from Start with these


  @regression @high @CP_009
  Scenario: CP_009 — Verify Free shipping banner displays appropriate messages
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the free shipping banner should display the empty-cart message
    When the customer adds a few products to the cart from the storefront
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the free shipping banner should display the below-threshold or unlocked-free-shipping message

  @regression @high @CP_011
  Scenario: CP_011 — Pant add to bag, cart payment methods, and checkout redirect
    Given prerequisite items for CP_011 pant variant exist in the cart for a signed user
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then different payment methods should be available below the checkout button
    When the customer clicks on the checkout button in the cart
    Then the customer should land on the review order details or checkout flow

  @regression @high @CP_012
  Scenario: CP_012 — Navigate from Cart Page to previous pages
    When the customer clicks on any product on the home page and adds it to the cart
    When the customer clicks on the bag icon on the Product Detail Page to open the cart
    Then the cart page or side cart should open
    When the customer navigates to previous pages using the back control
    Then the customer should be on a prior storefront or product page without liquid errors

 
  @regression @high @CP_018
  Scenario: CP_018 — Verify custom message for out of stock items and low stock product behaviour
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the cart page should show correct product details images and quantities for the items added
    And the cart totals section should show subtotal or monetary lines for promotions when present
    When the customer checks inventory edge behaviour when CART_INVENTORY_EDGE_PRODUCT_PATH is configured
    Then inventory or stock messages should appear or the edge line should clear when the theme applies them


  @regression @high @CP_019
  Scenario: CP_019 — Verify empty cart message after order is placed
    # Screenshot flow (same intent; add uses shared prerequisite for pant PDP stability):
    # 1. Log in as a signed user — Background + Given.
    # 2. Add product to the cart — prerequisite (home → PDP → Add to Bag → home). Then bag icon.
    # 3. Full cart page — verify lines + totals / promos.
    # 4. Clear lines, open `/cart`, empty message (same UI as after order clears the cart).
    Given the customer has logged in to the DEV URL
    Given prerequisite items should exist in the cart for a signed user
    When the customer clicks on the bag icon on the Home Page to open the cart page
    When the customer navigates to the storefront cart page by URL
    Then the cart page should show line items with product details for a non-empty cart
    And the cart totals section should show subtotal or monetary lines for promotions when present
    When the customer removes all items from the cart using remove until the cart is empty
    When the customer navigates to the storefront cart page by URL
    Then the empty cart message should display for a zero line item cart


  @regression @high @CP_020
  Scenario: CP_020 — Verify bundle, final sale, and promotional product prices in the cart
    # Recorded flow:
    #   1. Bundle    → Home → BUNDLES nav → Weekday Warrior Dress Pants card →
    #                  Waist 28 / Fit Tailored / Length 30 → ADD TO BAG.
    #   2. Final Sale → SALE mega-menu (XPath `//a[@aria-controls="NewHeaderMegaMenu-…__header_section-menu_column_VVHTDx"]`)
    #                  → click <img src*="PANT_CHINO-PANT_BWB00809S1006P">
    #                  (Original Chino - Winetasting) → Waist 29 / Fit Tailored / Length 30 → ADD TO BAG.
    #   3. Promotional → Back to Home → click <img src*="PANT_CHINO-PANT_BPT10629S1818B">
    #                  (The Chino 2.0 - Brownstones) → Waist 28 / Fit Tailored / Length 28 → ADD TO BAG.
    #   4. Final cart check → every line shows a discounted price AND the cart subtotal
    #                  equals the sum of (sale price × quantity) for all line items.
    Given the customer has logged in to the DEV URL
    When the customer adds the pinned bundle product and opens the cart page
    Then bundle or discounted price cues should be visible in the cart when configured
    When the customer adds the pinned final sale product and opens the cart page
    Then final sale discounted price cues should be visible in the cart when configured
    When the customer adds the pinned promotional product and opens the cart page
    Then promotional discounted price cues should be visible in the cart when configured
    When the customer reviews all added items in the cart
    Then all line items should show discounted prices and the cart total should match the sum
 
  @regression @high @CP_021
  Scenario: CP_021 — Verify promotional discount product price in the total section
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the promotional discount product should be available in the cart
    And the Subtotal Promo and Total section should reflect monetary lines
    And the Total amount should match subtotal minus discounts when parseable

  @regression @high @CP_024
  Scenario: CP_024 — Verify Social media-Logo connection
    When the customer goes to the footer section on the storefront
    Then the customer should verify social media logo links land on recognised hosts
 
  @regression @high @CP_025
  Scenario: CP_025 — Verify Footer links in cart page flow (PDP footer from home product)
    Given the customer has logged in to the DEV URL
    When the customer clicks on any product link on the Home Page
    When the customer scrolls to the footer section on the Product Detail Page
    Then each configured internal footer link should navigate or behave correctly

  @regression @high  @CP_026
  Scenario: CP_026 — Check different payment options
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the side cart should slide open on the home page
    When the customer clicks different payment options Shop Pay Apple Pay Paypal Affirm when shown
    Then a payment context or popup may open for an external host

  @regression @high @CP_027
  Scenario: CP_027 — Verify the side cart is loading fast and smooth
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the side cart should load fast and smooth without lagging when the bag icon is used
  

  @regression @high @CP_028
  Scenario: CP_028 — Verify Side cart opens on Add to Bag and closes on X
    When the customer adds a product to the cart by clicking Add to Bag from the product page
    Then the side cart should slide open automatically with the products added to the bag
    When the customer clicks on the X button to close the side cart when shown
    Then the side cart should close and no longer block the page



  @regression @high @CP_029
  Scenario: CP_029 — Verify products and quantities in cart (side cart)

    Given the customer has logged in to the DEV URL
    When the customer adds few products to the cart
    When the customer clicks on the bag icon to open the side-cart
    Then the correct product details images and quantities should be displayed correctly in the side-cart
    And the bag icon should show the correct product count

  @regression @high @CP_030
  Scenario: CP_030 — Verify decrease/increase quantity for multiple items (side cart)
    When the customer adds few products to the cart
    When the customer clicks on the bag icon to open the side-cart
    Then the customer should be allowed to decrease and increase quantity for multiple items added in the side-cart

  @regression @high @CP_033
  Scenario: CP_033 — Verify "Your Cart is empty" - Shop Pants, Shop Shirts, Shop New Arrivals, Shop Suits & Blazers
    Given the signed user has no items in the cart
    When the customer clicks on the bag icon to open the side-cart
    Then Your Cart is empty message should appear
    And Shop Pants Shop Shirts Shop New Arrivals Shop Suits and Blazers links should appear

  @regression @high @CP_034
  Scenario: CP_034 — Verify X button closes side cart
    Given the customer has logged in to the DEV URL
    Given prerequisite items should exist in the cart for a signed user
    When the customer clicks on the bag icon in the Home Page
    Then the side cart should slide open on the home page
    When the customer clicks on the X button in the side cart to close the cart
    Then the customer should be able to close the side cart

  @regression @high @CP_035
  Scenario: CP_035 — Check different payment options (side cart)
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon in the Home Page
    Then the side cart should slide open on the home page
    When the customer clicks on different payment options Shop Pay Apple Pay Paypal Affirm
    Then a payment context or popup may open for an external host
