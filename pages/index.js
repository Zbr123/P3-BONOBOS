/**
 * Page object barrel.
 *
 * Single import point so step files can do:
 *   const { HomePage } = require('../../pages');
 */

module.exports = {
  BasePage: require('./base.page'),
  HomePage: require('./homepage.page'),
  CartPage: require('./cart.page'),
};
