/**
 * Header component — reusable across pages.
 *
 * Components live in `pages/common/` and are *not* full page objects.
 * They take a `page` (or any locator scope) and expose targeted actions.
 */

const BasePage = require('../base.page');

class HeaderComponent extends BasePage {
  constructor(page) {
    super(page);

    this.selectors = {
      logo: '[data-test="site-logo"], a[href="/"] >> nth=0',
      cartIcon: '[data-test="cart-icon"], a[href*="/cart"]',
      searchInput: '[data-test="search-input"], input[type="search"]',
      accountMenu: '[data-test="account-menu"], a[href*="/account"]',
      signInLink: 'a[href*="/account/login"], a:has-text("Sign in")',
    };
  }

  async openCart() {
    await this.click(this.selectors.cartIcon, { label: 'cart icon' });
  }

  async search(query) {
    await this.fill(this.selectors.searchInput, query, { label: 'search' });
    await this.pressKey(this.selectors.searchInput, 'Enter');
  }

  async openSignIn() {
    await this.click(this.selectors.signInLink, { label: 'sign in' });
  }
}

module.exports = HeaderComponent;
