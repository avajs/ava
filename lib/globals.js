'use strict';

// Global objects / functions to be bound before requiring test file, so tests do not interfere.

var x = module.exports;

x.now = Date.now;

x.setTimeout = setTimeout;

x.clearTimeout = clearTimeout;

x.setImmediate = require('set-immediate-shim');

x.options = {};
