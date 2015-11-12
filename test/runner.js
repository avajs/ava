'use strict';
var test = require('tape');
var runner = require('../lib/runner');
var Test = require('../lib/test');
var Runner = runner;
var mockTitle = 'mock title';
var noop = function () {};

test('returns new instance of runner without "new"', function (t) {
	t.ok(runner({}) instanceof runner);
	t.end();
});

test('runner.addTest adds a new test', function (t) {
	var runner = new Runner();
	runner.addTest(mockTitle, noop);
	t.equal(runner.stats.testCount, 1);
	t.equal(runner.tests.concurrent.length, 1);
	t.ok(runner.tests.concurrent[0] instanceof Test);
	t.end();
});

test('runner.addSerialTest adds a new serial test', function (t) {
var runner = new Runner();
runner.addSerialTest(mockTitle, noop);
t.equal(runner.stats.testCount, 1);
t.equal(runner.tests.serial.length, 1);
t.ok(runner.tests.serial[0] instanceof Test);
t.end();
});

test('runner.addBeforeHook adds a new before hook', function (t) {
var runner = new Runner();
runner.addBeforeHook(mockTitle, noop);
t.equal(runner.tests.before.length, 1);
t.ok(runner.tests.before[0] instanceof Test);
t.equal(runner.tests.before[0].type, 'hook');
t.end();
});
