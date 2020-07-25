const Person = require('../js/popup');

describe('on startup', () => {
  it('should call chrome.storage.local.get once', () => {
    expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
  });
});
