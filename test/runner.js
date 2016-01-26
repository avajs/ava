'use strict';
var test = require('tap').test;
var runner = require('../lib/runner');
// var Test = require('../lib/test');
var Runner = runner;
// var mockTitle = 'mock title';
var noop = function () {};

test('returns new instance of runner without "new"', function (t) {
	t.ok(runner({}) instanceof runner);
	t.end();
});

test('runner emits a "test" event', function (t) {
	var runner = new Runner();

	runner.test(function foo(a) {
		a.pass();
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
		return function () {
			arr.push(title);
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

test('include skipped tests in results', function (t) {
	var runner = new Runner();

	runner.before('before', noop);
	runner.before.skip('before.skip', noop);

	runner.beforeEach('beforeEach', noop);
	runner.beforeEach.skip('beforeEach.skip', noop);

	runner.test.serial('test', noop);
	runner.test.serial.skip('test.skip', noop);

	runner.after('after', noop);
	runner.after.skip('after.skip', noop);

	runner.afterEach('afterEach', noop);
	runner.afterEach.skip('afterEach.skip', noop);

	runner.run().then(function () {
		var titles = runner.results.map(function (result) {
			return result.title;
		});

		t.same(titles, [
			'before',
			'before.skip',
			'beforeEach for test',
			'beforeEach.skip for test',
			'test',
			'afterEach for test',
			'afterEach.skip for test',
			'test.skip',
			'after',
			'after.skip'
		]);

		t.end();
	});
});

test('test types and titles', function (t) {
	t.plan(10);

	var fn = function (a) {
		a.pass();
	};

	function named(a) {
		a.pass();
	}

	var runner = new Runner();
	runner.before(named);
	runner.beforeEach(fn);
	runner.after(fn);
	runner.afterEach(named);
	runner.test('test', fn);

	var tests = [
		{type: 'before', title: 'named'},
		{type: 'beforeEach', title: 'beforeEach for test'},
		{type: 'test', title: 'test'},
		{type: 'afterEach', title: 'named for test'},
		{type: 'after', title: 'after'}
	];

	runner.on('test', function (props) {
		var test = tests.shift();

		t.is(props.title, test.title);
		t.is(props.type, test.type);
	});

	runner.run().then(t.end);
});

test('skip test', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.test(function () {
		arr.push('a');
	});

	runner.skip(function () {
		arr.push('b');
	});

	runner.run().then(function () {
		t.is(runner.stats.testCount, 2);
		t.is(runner.stats.passCount, 1);
		t.same(arr, ['a']);
		t.end();
	});
});

test('only test', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.test(function () {
		arr.push('a');
	});

	runner.only(function () {
		arr.push('b');
	});

	runner.run().then(function () {
		t.is(runner.stats.testCount, 1);
		t.is(runner.stats.passCount, 1);
		t.same(arr, ['b']);
		t.end();
	});
});
