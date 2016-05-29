'use strict';

// Global objects / functions to be bound before requiring test file, so tests do not interfere.

var x = module.exports;

x.now = Date.now;

// .call(null) prevents Illegal Invocation error in browser
var _setTimeout = setTimeout;
x.setTimeout = function (fn, delay) {
	_setTimeout.call(null, fn, delay);
};

var _clearTimeout = clearTimeout;
x.clearTimeout = function (timer) {
	_clearTimeout.call(null, timer);
};

x.setImmediate = require('set-immediate-shim');

x.options = {};
