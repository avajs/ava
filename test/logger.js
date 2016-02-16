'use strict';
var test = require('tap').test;
var Logger = require('../lib/logger');

test('must be called with new', function (t) {
	t.throws(function () {
		var logger = Logger;
		logger();
	}, {message: 'Class constructor Logger cannot be invoked without \'new\''});
	t.end();
});
