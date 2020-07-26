console.log("frienddl.io popup.js loaded");

import { Popup } from './popup_class.js';
// const Popup = require('./popup_class.js');
let popup = new Popup();

document.addEventListener(
  "DOMContentLoaded",
  function () {
    popup.onLoad();
  },
  false
);
