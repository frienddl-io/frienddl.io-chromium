const { chrome } = require('jest-chrome');

import { Background } from '../js/background_class.js';

describe('constructor', () => {
  beforeAll(() => {
    let background = new Background();
  });

  it('should add listener on chrome.runtime.onConnect', () => {
    expect(chrome.runtime.onConnect.hasListeners()).toBe(true);
  });

  it('should add listener on chrome.windows.onRemoved', () => {
    expect(chrome.windows.onRemoved.hasListeners()).toBe(true);
  });
});
