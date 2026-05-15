@pdp
Feature: Bonobos DEV — PDP archetype high-variant shirts (PDP_001..PDP_004)

  As a shopper configuring a dress shirt on PDP
  I want the page, gallery, and multi-level variant pickers to behave correctly
  so I can trust color accuracy and complete all required options before Add to Bag.

  Background:
    Given user is on the login page
    When he enters the password "sifrah"
    Then he should see the homepage

  @regression @high @PDP_001
  Scenario: PDP_001 — Verify loading of PDP in Chrome Browser
    # Steps: Log in DEV URL → Navigate to Shirt PDP (high-variant archetype)
    Given the customer has logged in to the DEV URL
    When the customer navigates to the shirt product detail page for PDP loading verification
    Then the shirt product detail page should load without excessive lag
    And the product detail page should not show a Liquid failure

  @regression @high @PDP_002
  Scenario: PDP_002 — Verify product images update when color swatch is selected
    Given the customer has logged in to the DEV URL
    When the customer navigates to the shirt product detail page for PDP loading verification
    When the customer selects a different shirt color swatch
    Then the main product image should update for the new shirt color

  @regression @high @PDP_003
  Scenario: PDP_003 — Verify 6-level variant selection on high-variant shirt PDP
    Given the customer has logged in to the DEV URL
    When the customer navigates to the shirt product detail page for PDP loading verification
    Then the shirt PDP should expose multiple variant dimensions including six levels when configured
    When the customer selects the first available option for each variant group on the shirt PDP
    Then ADD TO BAG should be enabled on the shirt PDP when all required variants are chosen

  # PDP_004: Pin `PDP_EVERYDAY_LINEN_SHIRT_PATH` in `.env` for the Everyday Linen SKU; otherwise the flow opens the same PDP discovery as PDP_003 until configured.
  @regression @high @PDP_004
  Scenario: PDP_004 — Verify multi-variant selection Everyday Linen Shirt
    Given the customer has logged in to the DEV URL
    When the customer navigates to the Everyday Linen shirt product detail page
    Then the product detail page should not show a Liquid failure
    When the customer selects the first available option for each variant group on the shirt PDP
    Then ADD TO BAG should be enabled on the shirt PDP when all required variants are chosen
