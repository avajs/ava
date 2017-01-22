'use strict';

// Global objects / functions to be bound before requiring test file, so tests do not interfere

const x = module.exports;
x.now = Date.now;
x.setTimeout = setTimeout;
x.clearTimeout = clearTimeout;
x.setImmediate = setImmediate;
x.options = {};
