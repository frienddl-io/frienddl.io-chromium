const { chrome } = require('jest-chrome');

import { Background } from '../js/background_class.js';
import Background, {mockStopSearch} from './background_class';
jest.mock('./background_class');

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

describe('checkWindowRemoved', () => {
  let windowId = "test_window_id";
  let windowObject = {
    windowId: windowId
  };

  beforeEach(() => {
    chrome.storage.local.get.mockImplementation(() => windowObject);
    // chrome.windows.onRemoved.callListeners(
    //   windowObject, // message
    //   {} // MessageSender object
    // );
  });

  it('should call chrome.storage.local.get once', () => {
    Background.checkWindowRemoved('');
    expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
  });

  describe('when the windowId matches response.windowId', () => {
    beforeAll(() => {
      Background.mockClear();
      mockStopSearch.mockClear();
    });

    it('calls stopSearch once', () => {
      Background.checkWindowRemoved(windowId);
      expect(mockStopSearch).toHaveBeenCalledTimes(1);
    });
  });

  // describe('when the windowId does not match response.windowId', () => {
  //   it('does not call stopSearch', () => {
  //     Background.checkWindowRemoved('');
  //     expect(Background.stopSearch).toHaveBeenCalledTimes(0);
  //   });
  // });
});
