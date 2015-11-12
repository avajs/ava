'use strict';
var test = require('tape');
var runner = require('../lib/runner');

test('returns new instance of runner without "new"', function (t) {
	t.ok(runner({}) instanceof runner);
	t.end();
});
