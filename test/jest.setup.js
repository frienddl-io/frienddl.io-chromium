global.window = window
global.$ = require('../js/jquery-3.5.1.min.js')

Object.assign(global, require('jest-chrome'))
