'use strict';
var path = require('path');
var test = require('tap').test;
var Runner = require('../lib/runner');
var fork = require('../lib/fork');

test('before', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.addBeforeHook(function (a) {
		arr.push('a');
		a.end();
	});

	runner.addTest(function (a) {
		arr.push('b');
		a.end();
	});

	runner.run().then(function () {
		t.same(arr, ['a', 'b']);
	});
});

test('after', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.addAfterHook(function (a) {
		arr.push('b');
		a.end();
	});

	runner.addTest(function (a) {
		arr.push('a');
		a.end();
	});

	runner.run().then(function () {
		t.same(arr, ['a', 'b']);
		t.end();
	});
});

test('stop if before hooks failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.addBeforeHook(function (a) {
		arr.push('a');
		a.end();
	});

	runner.addBeforeHook(function () {
		throw new Error('something went wrong');
	});

	runner.addTest(function (a) {
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

	runner.addBeforeEachHook(function (a) {
		arr[i++].push('a');
		a.end();
	});

	runner.addBeforeEachHook(function (a) {
		arr[k++].push('b');
		a.end();
	});

	runner.addTest(function (a) {
		arr[0].push('c');
		a.end();
	});

	runner.addTest(function (a) {
		arr[1].push('d');
		a.end();
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

	runner.addBeforeEachHook(function (a) {
		arr.push('a');
		a.end();
	});

	runner.addBeforeEachHook(function (a) {
		arr.push('b');
		a.end();
	});

	runner.addSerialTest(function (a) {
		arr.push('c');
		a.end();
	});

	runner.addSerialTest(function (a) {
		arr.push('d');
		a.end();
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

	runner.addBeforeEachHook(function (a) {
		arr.push('a');
		a.fail();
		a.end();
	});

	runner.addTest(function (a) {
		arr.push('b');
		a.pass();
		a.end();
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

	runner.addAfterEachHook(function (a) {
		arr[i++].push('a');
		a.end();
	});

	runner.addAfterEachHook(function (a) {
		arr[k++].push('b');
		a.end();
	});

	runner.addTest(function (a) {
		arr[0].push('c');
		a.end();
	});

	runner.addTest(function (a) {
		arr[1].push('d');
		a.end();
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

	runner.addAfterEachHook(function (a) {
		arr.push('a');
		a.end();
	});

	runner.addAfterEachHook(function (a) {
		arr.push('b');
		a.end();
	});

	runner.addSerialTest(function (a) {
		arr.push('c');
		a.end();
	});

	runner.addSerialTest(function (a) {
		arr.push('d');
		a.end();
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

	runner.addBeforeEachHook(function (a) {
		arr.push('beforeEach');
		a.end();
	});

	runner.addBeforeHook(function (a) {
		arr.push('before');
		a.end();
	});

	runner.addAfterEachHook(function (a) {
		arr.push('afterEach');
		a.end();
	});

	runner.addAfterHook(function (a) {
		arr.push('after');
		a.end();
	});

	runner.addTest(function (a) {
		arr.push('test');
		a.end();
	});

	runner.run().then(function () {
		t.same(arr, ['before', 'beforeEach', 'test', 'afterEach', 'after']);
		t.end();
	});
});

test('shared context', function (t) {
	t.plan(1);

	var runner = new Runner();

	runner.addBeforeHook(function (a) {
		a.is(a.context.arr, undefined);
		a.context.arr = [];
		a.end();
	});

	runner.addAfterHook(function (a) {
		a.is(a.context.arr, undefined);
		a.end();
	});

	runner.addBeforeEachHook(function (a) {
		a.context.arr = ['a'];
		a.end();
	});

	runner.addTest(function (a) {
		a.context.arr.push('b');
		a.same(a.context.arr, ['a', 'b']);
		a.end();
	});

	runner.addAfterEachHook(function (a) {
		a.context.arr.push('c');
		a.same(a.context.arr, ['a', 'b', 'c']);
		a.end();
	});

	runner.run().then(function () {
		t.is(runner.stats.failCount, 0);
		t.end();
	});
});

test('shared context of any type', function (t) {
	t.plan(1);

	var runner = new Runner();

	runner.addBeforeEachHook(function (a) {
		a.context = 'foo';
		a.end();
	});

	runner.addTest(function (a) {
		a.is(a.context, 'foo');
		a.end();
	});

	runner.run().then(function () {
		t.is(runner.stats.failCount, 0);
		t.end();
	});
});

test('don\'t display hook title if it did not fail', function (t) {
	t.plan(2);

	fork(path.join(__dirname, 'fixture', 'hooks-passing.js'))
		.on('test', function (test) {
			t.deepEqual(test.error, {});
			t.is(test.title, 'pass');
		})
		.then(function () {
			t.end();
		});
});

test('display hook title if it failed', function (t) {
	t.plan(2);

	fork(path.join(__dirname, 'fixture', 'hooks-failing.js'))
		.on('test', function (test) {
			t.is(test.error.name, 'AssertionError');
			t.is(test.title, 'beforeEach for "pass"');
		})
		.then(function () {
			t.end();
		});
});
