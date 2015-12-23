'use strict';
var path = require('path');
var test = require('tap').test;
var Runner = require('../lib/runner');
var _fork = require('../lib/fork');
var CachingPrecompiler = require('../lib/caching-precompiler');
var cacheDir = path.join(__dirname, '../node_modules/.cache/ava');
var precompiler = new CachingPrecompiler(cacheDir);

function fork(testPath) {
	return _fork(testPath, {
		cacheDir: cacheDir,
		precompiled: precompiler.generateHashForFile(testPath)
	});
}

test('before', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.before(function () {
		arr.push('a');
	});

	runner.test(function () {
		arr.push('b');
	});

	runner.run().then(function () {
		t.same(arr, ['a', 'b']);
	});
});

test('after', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.after(function () {
		arr.push('b');
	});

	runner.test(function () {
		arr.push('a');
	});

	runner.run().then(function () {
		t.is(runner.stats.passCount, 1);
		t.is(runner.stats.failCount, 0);
		t.same(arr, ['a', 'b']);
		t.end();
	});
});

test('stop if before hooks failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.before(function () {
		arr.push('a');
	});

	runner.before(function () {
		throw new Error('something went wrong');
	});

	runner.test(function (a) {
		arr.push('b');
		a.end();
	});

	runner.run().then(function () {
		t.same(arr, ['a']);
		t.end();
	});
});

test('before each with concurrent tests', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [[], []];
	var i = 0;
	var k = 0;

	runner.beforeEach(function () {
		arr[i++].push('a');
	});

	runner.beforeEach(function () {
		arr[k++].push('b');
	});

	runner.test(function () {
		arr[0].push('c');
	});

	runner.test(function () {
		arr[1].push('d');
	});

	runner.run().then(function () {
		t.same(arr, [['a', 'b', 'c'], ['a', 'b', 'd']]);
		t.end();
	});
});

test('before each with serial tests', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.beforeEach(function () {
		arr.push('a');
	});

	runner.beforeEach(function () {
		arr.push('b');
	});

	runner.serial(function () {
		arr.push('c');
	});

	runner.serial(function () {
		arr.push('d');
	});

	runner.run().then(function () {
		t.same(arr, ['a', 'b', 'c', 'a', 'b', 'd']);
		t.end();
	});
});

test('fail if beforeEach hook fails', function (t) {
	t.plan(2);

	var runner = new Runner();
	var arr = [];

	runner.beforeEach(function (a) {
		arr.push('a');
		a.fail();
	});

	runner.test(function (a) {
		arr.push('b');
		a.pass();
	});

	runner.run().then(function () {
		t.is(runner.stats.failCount, 1);
		t.same(arr, ['a']);
		t.end();
	});
});

test('after each with concurrent tests', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [[], []];
	var i = 0;
	var k = 0;

	runner.afterEach(function () {
		arr[i++].push('a');
	});

	runner.afterEach(function () {
		arr[k++].push('b');
	});

	runner.test(function () {
		arr[0].push('c');
	});

	runner.test(function () {
		arr[1].push('d');
	});

	runner.run().then(function () {
		t.same(arr, [['c', 'a', 'b'], ['d', 'a', 'b']]);
		t.end();
	});
});

test('after each with serial tests', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.afterEach(function () {
		arr.push('a');
	});

	runner.afterEach(function () {
		arr.push('b');
	});

	runner.serial(function () {
		arr.push('c');
	});

	runner.serial(function () {
		arr.push('d');
	});

	runner.run().then(function () {
		t.same(arr, ['c', 'a', 'b', 'd', 'a', 'b']);
		t.end();
	});
});

test('ensure hooks run only around tests', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.beforeEach(function () {
		arr.push('beforeEach');
	});

	runner.before(function () {
		arr.push('before');
	});

	runner.afterEach(function () {
		arr.push('afterEach');
	});

	runner.after(function () {
		arr.push('after');
	});

	runner.test(function () {
		arr.push('test');
	});

	runner.run().then(function () {
		t.same(arr, ['before', 'beforeEach', 'test', 'afterEach', 'after']);
		t.end();
	});
});

test('shared context', function (t) {
	t.plan(1);

	var runner = new Runner();

	runner.before(function (a) {
		a.is(a.context, undefined);
		a.context = {arr: []};
	});

	runner.after(function (a) {
		a.is(a.context, undefined);
	});

	runner.beforeEach(function (a) {
		a.context.arr = ['a'];
	});

	runner.test(function (a) {
		a.context.arr.push('b');
		a.same(a.context.arr, ['a', 'b']);
	});

	runner.afterEach(function (a) {
		a.context.arr.push('c');
		a.same(a.context.arr, ['a', 'b', 'c']);
	});

	runner.run().then(function () {
		t.is(runner.stats.failCount, 0);
		t.end();
	});
});

test('shared context of any type', function (t) {
	t.plan(1);

	var runner = new Runner();

	runner.beforeEach(function (a) {
		a.context = 'foo';
	});

	runner.test(function (a) {
		a.is(a.context, 'foo');
	});

	runner.run().then(function () {
		t.is(runner.stats.failCount, 0);
		t.end();
	});
});

test('don\'t display hook title if it did not fail', function (t) {
	t.plan(2);

	fork(path.join(__dirname, 'fixture', 'hooks-passing.js'))
		.run()
		.on('test', function (test) {
			t.same(test.error, {});
			t.is(test.title, 'pass');
		})
		.then(function () {
			t.end();
		});
});

test('display hook title if it failed', function (t) {
	t.plan(2);

	fork(path.join(__dirname, 'fixture', 'hooks-failing.js'))
		.run()
		.on('test', function (test) {
			t.is(test.error.name, 'AssertionError');
			t.is(test.title, 'beforeEach for "pass"');
		})
		.then(function () {
			t.end();
		});
});
