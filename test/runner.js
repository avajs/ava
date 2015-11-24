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

test('runner.test adds a new test', function (t) {
	var runner = new Runner();
	runner.test(mockTitle, noop);
	t.is(runner.tests.length, 1);
	t.true(runner.tests[0] instanceof Test);
	t.false(runner.tests[0].metadata.serial);
	t.end();
});

test('runner.serial adds a new serial test', function (t) {
	var runner = new Runner();
	runner.serial(mockTitle, noop);
	t.is(runner.tests.length, 1);
	t.true(runner.tests[0] instanceof Test);
	t.true(runner.tests[0].metadata.serial);
	t.end();
});

test('runner.before adds a new before hook', function (t) {
	var runner = new Runner();
	runner.before(mockTitle, noop);
	t.is(runner.tests.length, 1);
	t.true(runner.tests[0] instanceof Test);
	t.is(runner.tests[0].metadata.type, 'before');
	t.end();
});

test('runner.after adds a new after hook', function (t) {
	var runner = new Runner();
	runner.after(mockTitle, noop);
	t.is(runner.tests.length, 1);
	t.true(runner.tests[0] instanceof Test);
	t.is(runner.tests[0].metadata.type, 'after');
	t.end();
});

test('runner.beforeEach adds a new beforeEach hook', function (t) {
	var runner = new Runner();
	runner.beforeEach(mockTitle, noop);
	t.is(runner.tests.length, 1);
	t.is(runner.tests[0].title, mockTitle);
	t.is(runner.tests[0].fn, noop);
	t.is(runner.tests[0].metadata.type, 'beforeEach');
	t.end();
});

test('runner.beforeEach title is optional', function (t) {
	function doThisFirst() {}
	var runner = new Runner();
	runner.beforeEach(doThisFirst);
	t.is(runner.tests.length, 1);
	// TODO(jamestalmage): Make `title` logic common between Hook and Test
	t.is(runner.tests[0].title, null);
	t.is(runner.tests[0].fn, doThisFirst);
	t.is(runner.tests[0].metadata.type, 'beforeEach');
	t.end();
});

test('runner.afterEach adds a new afterEach hook', function (t) {
	var runner = new Runner();
	runner.afterEach(mockTitle, noop);
	t.is(runner.tests.length, 1);
	t.is(runner.tests[0].title, mockTitle);
	t.is(runner.tests[0].fn, noop);
	t.is(runner.tests[0].metadata.type, 'afterEach');
	t.end();
});

test('runner.skip adds a new skipped test', function (t) {
	var runner = new Runner();
	runner.skip(mockTitle, noop);
	t.is(runner.tests.length, 1);
	t.true(runner.tests[0] instanceof Test);
	t.is(runner.tests[0].title, mockTitle);
	t.is(runner.tests[0].metadata.skipped, true);
	t.end();
});

test('runner.skip - title is optional', function (t) {
	var runner = new Runner();
	runner.skip(noop);
	t.is(runner.tests.length, 1);
	t.true(runner.tests[0] instanceof Test);
	t.is(runner.tests[0].title, '[anonymous]');
	t.is(runner.tests[0].metadata.skipped, true);
	t.end();
});

test('methods are chainable: serial.skip', function (t) {
	var runner = new Runner();
	runner.serial.skip(noop);
	t.is(runner.tests.length, 1);
	t.is(runner.tests[0].metadata.type, 'test');
	t.true(runner.tests[0].metadata.serial);
	t.false(runner.tests[0].metadata.exclusive);
	t.true(runner.tests[0].metadata.skipped);
	t.end();
});

test('methods are chainable: beforeEach.skip', function (t) {
	var runner = new Runner();
	runner.beforeEach.skip(noop);
	t.is(runner.tests.length, 1);
	t.is(runner.tests[0].metadata.type, 'beforeEach');
	t.false(runner.tests[0].metadata.serial);
	t.false(runner.tests[0].metadata.exclusive);
	t.true(runner.tests[0].metadata.skipped);
	t.end();
});

test('methods are chainable: serial.only', function (t) {
	var runner = new Runner();
	runner.serial.only(noop);
	t.is(runner.tests.length, 1);
	t.is(runner.tests[0].metadata.type, 'test');
	t.true(runner.tests[0].metadata.serial);
	t.true(runner.tests[0].metadata.exclusive);
	t.false(runner.tests[0].metadata.skipped);
	t.end();
});

test('runner emits a "test" event', function (t) {
	var runner = new Runner();

	runner.test(function foo(a) {
		a.end();
	});

	runner.on('test', function (props) {
		t.ifError(props.error);
		t.is(props.title, 'foo');
		t.not(props.duration, undefined);
		t.end();
	});

	runner.run();
});

test('run serial tests before concurrent ones', function (t) {
	var runner = new Runner();
	var arr = [];

	runner.test(function (a) {
		arr.push('c');
		a.end();
	});

	runner.serial(function (a) {
		arr.push('a');
		a.end();
	});

	runner.serial(function (a) {
		arr.push('b');
		a.end();
	});

	runner.run().then(function () {
		t.same(arr, ['a', 'b', 'c']);
		t.end();
	});
});

test('anything can be skipped', function (t) {
	var runner = new Runner();
	var arr = [];

	function pusher(title) {
		return function (a) {
			arr.push(title);
			a.end();
		};
	}

	runner.after(pusher('after'));
	runner.after.skip(pusher('after.skip'));

	runner.afterEach(pusher('afterEach'));
	runner.afterEach.skip(pusher('afterEach.skip'));

	runner.before(pusher('before'));
	runner.before.skip(pusher('before.skip'));

	runner.beforeEach(pusher('beforeEach'));
	runner.beforeEach.skip(pusher('beforeEach.skip'));

	runner.test(pusher('concurrent'));
	runner.test.skip(pusher('concurrent.skip'));

	runner.serial(pusher('serial'));
	runner.serial.skip(pusher('serial.skip'));

	runner.run().then(function () {
		// Note that afterEach and beforeEach run twice because there are two actual tests - "serial" and "concurrent"
		t.same(arr, [
			'before',
			'beforeEach',
			'serial',
			'afterEach',
			'beforeEach',
			'concurrent',
			'afterEach',
			'after'
		]);
		t.end();
	});
});

test('test types and titles', function (t) {
	t.plan(10);

	var runner = new Runner();
	runner.before(pass);
	runner.beforeEach(pass);
	runner.after(pass);
	runner.afterEach(pass);
	runner.test('test', pass);

	function pass(a) {
		a.end();
	}

	var tests = [
		{type: 'before', title: 'pass'},
		{type: 'beforeEach', title: 'beforeEach for "test"'},
		{type: 'test', title: 'test'},
		{type: 'afterEach', title: 'afterEach for "test"'},
		{type: 'after', title: 'pass'}
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

	runner.test(function (a) {
		arr.push('a');
		a.end();
	});

	runner.skip(function (a) {
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

	runner.test(function (a) {
		arr.push('a');
		a.end();
	});

	runner.only(function (a) {
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
