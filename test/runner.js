'use strict';
var test = require('tap').test;
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

test('runner.addAfterHook adds a new after hook', function (t) {
	var runner = new Runner();
	runner.addAfterHook(mockTitle, noop);
	t.equal(runner.tests.after.length, 1);
	t.ok(runner.tests.after[0] instanceof Test);
	t.equal(runner.tests.after[0].type, 'hook');
	t.end();
});

test('runner.addBeforeEachHook adds a new before hook', function (t) {
	var runner = new Runner();
	runner.addBeforeEachHook(mockTitle, noop);
	t.equal(runner.tests.beforeEach.length, 1);
	t.equal(runner.tests.beforeEach[0].title, mockTitle);
	t.equal(runner.tests.beforeEach[0].fn, noop);
	t.end();
});

test('runner.addAfterEachHook adds a new after hook', function (t) {
	var runner = new Runner();
	runner.addAfterEachHook(mockTitle, noop);
	t.equal(runner.tests.afterEach.length, 1);
	t.equal(runner.tests.afterEach[0].title, mockTitle);
	t.equal(runner.tests.afterEach[0].fn, noop);
	t.end();
});

test('runner.addSkippedTest adds a new skipped test', function (t) {
	var runner = new Runner();
	runner.addSkippedTest(mockTitle, noop);
	t.equal(runner.tests.concurrent.length, 1);
	t.ok(runner.tests.concurrent[0] instanceof Test);
	t.equal(runner.tests.concurrent[0].skip, true);
	t.end();
});

test('runner have test event', function (t) {
	var runner = new Runner();

	runner.addTest(function foo(a) {
		a.end();
	});

	runner.on('test', function (props) {
		t.error(props.error);
		t.equal(props.title, 'foo');
		t.notEqual(props.duration, undefined);
		t.end();
	});

	runner.run();
});

test('run serial tests before concurrent ones', function (t) {
	var runner = new Runner();
	var arr = [];

	runner.addTest(function (a) {
		arr.push('c');
		a.end();
	});

	runner.addSerialTest(function (a) {
		arr.push('a');
		a.end();
	});

	runner.addSerialTest(function (a) {
		arr.push('b');
		a.end();
	});

	runner.run().then(function () {
		t.same(arr, ['a', 'b', 'c']);
		t.end();
	});
});

test('test types and titles', function (t) {
	t.plan(10);

	var runner = new Runner();
	runner.addBeforeHook(pass);
	runner.addBeforeEachHook(pass);
	runner.addAfterHook(pass);
	runner.addAfterEachHook(pass);
	runner.addTest('test', pass);

	function pass(a) {
		a.end();
	}

	var tests = [
		{type: 'hook', title: 'pass'},
		{type: 'eachHook', title: 'beforeEach for "test"'},
		{type: 'test', title: 'test'},
		{type: 'eachHook', title: 'afterEach for "test"'},
		{type: 'hook', title: 'pass'}
	];

	runner.on('test', function (props) {
		var test = tests.shift();

		t.is(test.title, props.title);
		t.is(test.type, props.type);
	});

	runner.run().then(t.end);
});

test('skip test', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.addTest(function (a) {
		arr.push('a');
		a.end();
	});

	runner.addSkippedTest(function (a) {
		arr.push('b');
		a.end();
	});

	runner.run().then(function () {
		t.is(runner.stats.testCount, 1);
		t.is(runner.stats.passCount, 1);
		t.same(arr, ['a']);
		t.end();
	});
});

test('only test', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.addTest(function (a) {
		arr.push('a');
		a.end();
	});

	runner.addOnlyTest(function (a) {
		arr.push('b');
		a.end();
	});

	runner.run().then(function () {
		t.is(runner.stats.testCount, 1);
		t.is(runner.stats.passCount, 1);
		t.same(arr, ['b']);
		t.end();
	});
});
