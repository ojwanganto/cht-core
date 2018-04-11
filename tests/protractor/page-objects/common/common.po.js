const helper = require('../../helper'),
      utils = require('../../utils'),
      medicLogo = element(by.className('logo-full')),
      messagesLink = element(by.id('messages-tab')),
      analyticsLink = element(by.id('analytics-tab')),
      configurationLink = element(by.css('[ui-sref=configuration]')),
      hamburgerMenu = element(by.className('dropdown options')),
      logoutButton = $('[ng-click=logout]');

module.exports = {
  goToMessages: () => {
    browser.get(utils.getBaseUrl() + 'messages/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('message-list')));
  },

  goToTasks: () => {
    browser.get(utils.getBaseUrl() + 'tasks/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('tasks-list')));
  },

  goToPeople: () => {
    browser.get(utils.getBaseUrl() + 'contacts/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('contacts-list')));
  },

  goToReports: () => {
    browser.get(utils.getBaseUrl() + 'reports/');
    helper.handleUpdateModal();
    helper.waitElementToBeClickable(element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')));
    helper.waitElementToBeVisible(element(by.id('reports-list')));
    helper.handleUpdateModal();
  },

  goToAnalytics: () => {
    helper.clickElement(analyticsLink);
    helper.waitUntilReady(medicLogo);
  },

  goToConfiguration: () => {
    helper.waitUntilReady(medicLogo);
    helper.clickElement(configurationLink);
  },

  openMenu: () => {
    helper.waitUntilReady(messagesLink);
    helper.clickElement(hamburgerMenu);
  },

  goHome: () => {
    helper.waitUntilReady(medicLogo);
    helper.clickElement(medicLogo);
  },

  isAt: list => {
    helper.waitUntilReady(medicLogo);
    return element(by.id(list)).isPresent();
  },

  logout: () => {
    hamburgerMenu.click();
    helper.waitElementToBeVisible(logoutButton);
    helper.clickElement(logoutButton);
  }
};
