/**
 * Page object barrel.
 *
 * Single import point so step files can do:
 *   const { HomePage } = require('../../pages');
 */

module.exports = {
  BasePage: require('./base.page'),
  HomePage: require('./homepage.page'),
  HeaderComponent: require('./common/header.component'),
  FooterComponent: require('./common/footer.component'),
};
