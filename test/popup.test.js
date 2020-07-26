const { chrome } = require('jest-chrome');
require('../js/popup');

describe('on startup', () => {
  it('should call chrome.storage.local.get once', () => {
    expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
  });

  it('should call chrome.i18n.getMessage 19 times', () => {
    expect(chrome.i18n.getMessage).toHaveBeenCalledTimes(19);
  });

  it('should have listener on chrome.storage.onChanged', () => {
    expect(chrome.storage.onChanged.hasListeners()).toBe(true)
  });
});
