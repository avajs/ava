'use strict';
var test = require('tap').test;
var AvaError = require('../lib/ava-error');

test('must be called with new', function (t) {
	t.throws(function () {
		var avaError = AvaError;
		avaError('test message');
	}, {message: 'Class constructor AvaError cannot be invoked without \'new\''});
	t.end();
});
