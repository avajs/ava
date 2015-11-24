'use strict';
var path = require('path');
var test = require('tap').test;
var Runner = require('../lib/runner');
var fork = require('../lib/fork');

test('before', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.before(function (a) {
		arr.push('a');
		a.end();
	});

	runner.test(function (a) {
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

	runner.after(function (a) {
		arr.push('b');
		a.end();
	});

	runner.test(function (a) {
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

	runner.before(function (a) {
		arr.push('a');
		a.end();
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

	runner.beforeEach(function (a) {
		arr[i++].push('a');
		a.end();
	});

	runner.beforeEach(function (a) {
		arr[k++].push('b');
		a.end();
	});

	runner.test(function (a) {
		arr[0].push('c');
		a.end();
	});

	runner.test(function (a) {
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

	runner.beforeEach(function (a) {
		arr.push('a');
		a.end();
	});

	runner.beforeEach(function (a) {
		arr.push('b');
		a.end();
	});

	runner.serial(function (a) {
		arr.push('c');
		a.end();
	});

	runner.serial(function (a) {
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

	runner.beforeEach(function (a) {
		arr.push('a');
		a.fail();
		a.end();
	});

	runner.test(function (a) {
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

	runner.afterEach(function (a) {
		arr[i++].push('a');
		a.end();
	});

	runner.afterEach(function (a) {
		arr[k++].push('b');
		a.end();
	});

	runner.test(function (a) {
		arr[0].push('c');
		a.end();
	});

	runner.test(function (a) {
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

	runner.afterEach(function (a) {
		arr.push('a');
		a.end();
	});

	runner.afterEach(function (a) {
		arr.push('b');
		a.end();
	});

	runner.serial(function (a) {
		arr.push('c');
		a.end();
	});

	runner.serial(function (a) {
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

	runner.beforeEach(function (a) {
		arr.push('beforeEach');
		a.end();
	});

	runner.before(function (a) {
		arr.push('before');
		a.end();
	});

	runner.afterEach(function (a) {
		arr.push('afterEach');
		a.end();
	});

	runner.after(function (a) {
		arr.push('after');
		a.end();
	});

	runner.test(function (a) {
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

	runner.before(function (a) {
		a.is(a.context, undefined);
		a.context = {arr: []};
		a.end();
	});

	runner.after(function (a) {
		a.is(a.context, undefined);
		a.end();
	});

	runner.beforeEach(function (a) {
		a.context.arr = ['a'];
		a.end();
	});

	runner.test(function (a) {
		a.context.arr.push('b');
		a.same(a.context.arr, ['a', 'b']);
		a.end();
	});

	runner.afterEach(function (a) {
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

	runner.beforeEach(function (a) {
		a.context = 'foo';
		a.end();
	});

	runner.test(function (a) {
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
		.on('test', function (test) {
			t.is(test.error.name, 'AssertionError');
			t.is(test.title, 'beforeEach for "pass"');
		})
		.then(function () {
			t.end();
		});
});
