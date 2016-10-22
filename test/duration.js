'use strict';

var test = require('tap').test;
var duration = require('../lib/duration');

test('displays milliseconds', function (t) {
	t.is(duration(0), '0ms');
	t.is(duration(1), '1ms');
	t.is(duration(500), '500ms');
	t.is(duration(999), '999ms');
	t.end();
});

test('calculates seconds', function (t) {
	var second = 1000;

	t.is(duration(second), '1s');
	t.is(duration(second + 49), '1.049s');
	t.is(duration((second * 6) - 1), '5.999s');
	t.is(duration((second * 60) - 1), '59.999s');
	t.end();
});

test('calculates minutes', function (t) {
	var minute = 1000 * 60;

	t.is(duration(minute), '1m');
	t.is(duration(minute * 5 / 3), '1.667m');
	t.is(duration(minute * 59.5), '59.5m');
	t.is(duration((minute * 60) - 1), '60m');
	t.end();
});

test('calculates hours', function (t) {
	var hour = 1000 * 60 * 60;

	t.is(duration(hour), '1h');
	t.is(duration(hour * 5 / 3), '1.667h');
	t.is(duration(hour * 23.5), '23.5h');
	t.is(duration((hour * 24) - 1), '24h');
	t.end();
});

test('calculates days', function (t) {
	var day = 1000 * 60 * 60 * 24;

	t.is(duration(day), '1d');
	t.is(duration(day * 5 / 3), '1.667d');
	t.is(duration(day * 364.5), '364.5d');
	t.is(duration(day * 500), '500d');
	t.end();
});
