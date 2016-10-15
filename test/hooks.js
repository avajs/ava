'use strict';
var path = require('path');
var test = require('tap').test;
var Runner = require('../lib/runner');
var _fork = require('../lib/fork.js');
var CachingPrecompiler = require('../lib/caching-precompiler');

var cacheDir = path.join(__dirname, '../node_modules/.cache/ava');
var precompiler = new CachingPrecompiler({path: cacheDir});

function fork(testPath) {
	var hash = precompiler.precompileFile(testPath);
	var precompiled = {};
	precompiled[testPath] = hash;

	return _fork(testPath, {
		cacheDir: cacheDir,
		precompiled: precompiled
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

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['a', 'b']);
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

	return runner.run({}).then(function (stats) {
		t.is(stats.passCount, 1);
		t.is(stats.failCount, 0);
		t.strictDeepEqual(arr, ['a', 'b']);
		t.end();
	});
});

test('after not run if test failed', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.after(function () {
		arr.push('a');
	});

	runner.test(function () {
		throw new Error('something went wrong');
	});
	return runner.run({}).then(function (stats) {
		t.is(stats.passCount, 0);
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, []);
		t.end();
	});
});

test('after.always run even if test failed', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.after.always(function () {
		arr.push('a');
	});

	runner.test(function () {
		throw new Error('something went wrong');
	});
	return runner.run({}).then(function (stats) {
		t.is(stats.passCount, 0);
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('after.always run even if before failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.before(function () {
		throw new Error('something went wrong');
	});

	runner.after.always(function () {
		arr.push('a');
	});

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['a']);
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

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['a']);
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

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, [['a', 'b', 'c'], ['a', 'b', 'd']]);
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

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['a', 'b', 'c', 'a', 'b', 'd']);
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

	return runner.run({}).then(function (stats) {
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, ['a']);
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

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, [['c', 'a', 'b'], ['d', 'a', 'b']]);
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

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['c', 'a', 'b', 'd', 'a', 'b']);
		t.end();
	});
});

test('afterEach not run if concurrent tests failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.afterEach(function () {
		arr.push('a');
	});

	runner.test(function () {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, []);
		t.end();
	});
});

test('afterEach not run if serial tests failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.afterEach(function () {
		arr.push('a');
	});

	runner.serial(function () {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, []);
		t.end();
	});
});

test('afterEach.always run even if concurrent tests failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.afterEach.always(function () {
		arr.push('a');
	});

	runner.test(function () {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('afterEach.always run even if serial tests failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.afterEach.always(function () {
		arr.push('a');
	});

	runner.serial(function () {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('afterEach.always run even if beforeEach failed', function (t) {
	t.plan(1);

	var runner = new Runner();
	var arr = [];

	runner.beforeEach(function () {
		throw new Error('something went wrong');
	});

	runner.test(function () {
		arr.push('a');
	});

	runner.afterEach.always(function () {
		arr.push('b');
	});

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['b']);
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

	return runner.run({}).then(function () {
		t.strictDeepEqual(arr, ['before', 'beforeEach', 'test', 'afterEach', 'after']);
		t.end();
	});
});

test('shared context', function (t) {
	t.plan(1);

	var runner = new Runner();

	runner.before(function (a) {
		a.is(a.context, null);
	});

	runner.after(function (a) {
		a.is(a.context, null);
	});

	runner.beforeEach(function (a) {
		a.context.arr = ['a'];
	});

	runner.test(function (a) {
		a.context.arr.push('b');
		a.deepEqual(a.context.arr, ['a', 'b']);
	});

	runner.afterEach(function (a) {
		a.context.arr.push('c');
		a.deepEqual(a.context.arr, ['a', 'b', 'c']);
	});

	return runner.run({}).then(function (stats) {
		t.is(stats.failCount, 0);
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

	return runner.run({}).then(function (stats) {
		t.is(stats.failCount, 0);
		t.end();
	});
});

test('don\'t display hook title if it did not fail', function (t) {
	t.plan(2);

	return fork(path.join(__dirname, 'fixture', 'hooks-passing.js'))
		.run({})
		.on('test', function (test) {
			t.strictDeepEqual(test.error, null);
			t.is(test.title, 'pass');
		})
		.then(function () {
			t.end();
		});
});

test('display hook title if it failed', function (t) {
	t.plan(2);

	return fork(path.join(__dirname, 'fixture', 'hooks-failing.js'))
		.run({})
		.on('test', function (test) {
			t.is(test.error.name, 'AssertionError');
			t.is(test.title, 'fail for pass');
		})
		.then(function () {
			t.end();
		});
});
