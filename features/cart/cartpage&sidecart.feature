@cart
Feature: Bonobos DEV — Cart page & side cart

  Background:
    Given user is on the login page
    When he enters the password "sifrah"
    Then he should see the homepage



  @regression @high @CP_001
  Scenario: CP_001 — Verify loading of Cart page in Chrome browser
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
  Scenario: CP_006 — Verify Your Cart is empty and shop links
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    When the customer removes all items from the cart using remove until the cart is empty
    Then the last item should be removed and Your Cart is empty should display with shop merchandising links
    And the shop pants shop shirts shop new arrivals and shop suits links should navigate to respective pages
 
  @regression @high @CP_007
  Scenario: CP_007 — Verify Shop the Look appears with products
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the items added to the cart should be present and Shop the Look or equivalent section should appear when the theme shows it
    When the customer navigates the Shop the Look section using the carousel arrows when present
    When the customer clicks ADD TO BAG on a product in the cart recommendations section when available
    When the customer clicks on a product image in the cart recommendations section when available
    Then the customer should land on a product detail page from the recommendation image when that control exists


  @regression @high @CP_009
  Scenario: CP_009 — Verify Free shipping banner displays appropriate messages
    Given the automation run starts with an empty cart before the scenario
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the free shipping banner should display the empty-cart message
    When the customer adds a few products to the cart from the storefront
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the free shipping banner should display the below-threshold or unlocked-free-shipping message
  # ---------------------------------------------------------------------------
  # CP_011 — (1) Pre-req. (2) Bag. (3) Gift note +. (4) Payment methods under checkout.
  # (5) Checkout lands on Review Order Details.
  # ---------------------------------------------------------------------------
  @regression @high @CP_011
  Scenario: CP_011 — Verify Gift note, different payment method and checkout button
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    When the customer verifies a gift note can be added by clicking on plus
    Then different payment methods should be available below the checkout button
    When the customer clicks on the checkout button in the cart
    Then the customer should land on the review order details or checkout flow
  # ---------------------------------------------------------------------------
  # CP_012 — (1) Log in — Background. (2) Product on home + add. (3) Bag on PDP.
  # (4) Cart opens; navigate back with back arrow.
  # ---------------------------------------------------------------------------
  @regression @high @CP_012
  Scenario: CP_012 — Navigate from Cart Page to previous pages
    Given the customer has logged in to the DEV URL
    When the customer clicks on any product on the home page and adds it to the cart
    When the customer clicks on the bag icon on the Product Detail Page to open the cart
    Then the cart page or side cart should open
    When the customer navigates to previous pages using the back control
    Then the customer should be on a prior storefront or product page without liquid errors
  # ---------------------------------------------------------------------------
  # CP_020 — bundle / final sale / promotional price checks (optional env product paths).
  # ---------------------------------------------------------------------------
  @regression @high @CP_020
  Scenario: CP_020 — Verify bundle price, final sale, and promotional products display prices as expected
    Given the customer has logged in to the DEV URL
    When the customer adds a bundle product and opens the cart page when CART_BUNDLE_PRODUCT_PATH is configured
    Then bundle or discounted price cues should be visible in the cart when configured
    When the customer adds a final sale product and opens the cart page when CART_FINAL_SALE_PRODUCT_PATH is configured
    Then final sale discounted price cues should be visible in the cart when configured
    When the customer adds a promotional product and opens the cart page when CART_PROMO_PRODUCT_PATH is configured
    Then promotional discounted price cues should be visible in the cart when configured
  # ---------------------------------------------------------------------------
  # CP_021 — (1) Promo product in cart. (2) Subtotal. (3) Promo. (4) Total.
  # ---------------------------------------------------------------------------
  @regression @high @CP_021
  Scenario: CP_021 — Verify promotional discount product price in the total section
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the promotional discount product should be available in the cart
    And the Subtotal Promo and Total section should reflect monetary lines
    And the Total amount should match subtotal minus discounts when parseable
  # ---------------------------------------------------------------------------
  # CP_024 — (1) Log in — Background. (2) Footer. (3) Social logos.
  # ---------------------------------------------------------------------------
  @regression @high @CP_024
  Scenario: CP_024 — Verify Social media-Logo connection
    Given the customer has logged in to the DEV URL
    When the customer goes to the footer section on the storefront
    Then the customer should verify social media logo links land on recognised hosts
  # ---------------------------------------------------------------------------
  # CP_025 — (1) Log in — Background. (2) Product on Home. (3) Footer on PDP. (4) Footer links.
  # ---------------------------------------------------------------------------
  @regression @high @CP_025
  Scenario: CP_025 — Verify Footer links in cart page flow (PDP footer from home product)
    Given the customer has logged in to the DEV URL
    When the customer clicks on any product link on the Home Page
    When the customer scrolls to the footer section on the Product Detail Page
    When the customer clicks the sample footer links to ensure they direct to correct pages
    Then each sampled footer link destination should be healthy
  # ---------------------------------------------------------------------------
  # CP_026 — (1) Log in — Background. (2) Bag on Home. (3) Side cart opens. (4) Payment options.
  # ---------------------------------------------------------------------------
  @regression @high @flaky @CP_026
  Scenario: CP_026 — Check different payment options
    Given prerequisite items should exist in the cart for a signed user
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the side cart should slide open on the home page
    When the customer clicks different payment options Shop Pay Apple Pay Paypal Affirm when shown
    Then a payment context or popup may open for an external host
  # ---------------------------------------------------------------------------
  # CP_027 — (1) Log in — Background. (2) Bag. (3) Side cart fast/smooth.
  # ---------------------------------------------------------------------------
  @regression @high @CP_027
  Scenario: CP_027 — Verify the side cart is loading fast and smooth
    Given the customer has logged in to the DEV URL
    When the customer clicks on the bag icon on the Home Page to open the cart page
    Then the side cart should load fast and smooth without lagging when the bag icon is used
  # ---------------------------------------------------------------------------
  # CP_028 — (1) Log in — Background. (2) Add to Bag. (3) Side cart auto opens. (4) X closes.
  # ---------------------------------------------------------------------------
  @regression @high @CP_028
  Scenario: CP_028 — Verify Side cart opens on Add to Bag and closes on X
    Given the customer has logged in to the DEV URL
    When the customer adds a product to the cart by clicking Add to Bag from the product page
    Then the side cart should slide open automatically with the products added to the bag
    When the customer clicks on the X button to close the side cart when shown
    Then the side cart should close and no longer block the page
