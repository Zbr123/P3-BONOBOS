/**
 * Footer component — reusable across pages.
 */

const BasePage = require('../base.page');

class FooterComponent extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      footer: 'footer',
      newsletterInput: 'footer input[type="email"]',
      newsletterSubmit: 'footer button[type="submit"]',
    };
  }

  async subscribe(email) {
    await this.fill(this.selectors.newsletterInput, email, {
      label: 'newsletter email',
    });
    await this.click(this.selectors.newsletterSubmit, {
      label: 'newsletter submit',
    });
  }
}

module.exports = FooterComponent;
