'use strict';
var path = require('path');
var childProcess = require('child_process');
var Promise = require('bluebird');
var figures = require('figures');
var test = require('tape');
var Runner = require('../lib/runner');
var ava = require('../lib/test');

function execCli(args, cb) {
	if (!Array.isArray(args)) {
		args = [args];
	}

	childProcess.execFile(process.execPath, ['../cli.js'].concat(args), {cwd: __dirname}, cb);
}

test('run test', function (t) {
	ava('foo', function (a) {
		a.fail();
		a.end();
	}).run().catch(function (err) {
		t.true(err);
		t.end();
	});
});

test('test title is optional', function (t) {
	ava(function (a) {
		a.end();
	}).run().then(function (a) {
		t.is(a.title, '[anonymous]');
		t.end();
	});
});

test('infer test name from function', function (t) {
	ava(function foo(a) {
		a.end();
	}).run().then(function (a) {
		t.is(a.title, 'foo');
		t.end();
	});
});

test('multiple asserts', function (t) {
	ava(function (a) {
		a.pass();
		a.pass();
		a.pass();
		a.end();
	}).run().then(function (a) {
		t.is(a.assertCount, 3);
		t.end();
	});
});

test('plan assertions', function (t) {
	ava(function (a) {
		a.plan(2);
		a.pass();
		a.pass();
	}).run().then(function (a) {
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
		t.end();
	});
});

test('plan assertions with support for promises', function (t) {
	ava(function (a) {
		a.plan(2);

		var promise = Promise.resolve();

		setTimeout(function () {
			a.pass();
			a.pass();
		}, 200);

		return promise;
	}).run().then(function (a) {
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
		t.end();
	});
});

test('run more assertions than planned', function (t) {
	ava(function (a) {
		a.plan(2);
		a.pass();
		a.pass();
		a.pass();
	}).run().catch(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle non-assertion errors', function (t) {
	ava(function () {
		throw new Error();
	}).run().catch(function (err) {
		t.is(err.name, 'Error');
		t.true(err instanceof Error);
		t.end();
	});
});

test('handle non-assertion errors even when planned', function (t) {
	ava(function (a) {
		a.plan(1);
		throw new Error();
	}).run().catch(function (err) {
		t.is(err.name, 'Error');
		t.true(err instanceof Error);
		t.end();
	});
});

test('handle testing of arrays', function (t) {
	ava(function (a) {
		a.same(['foo', 'bar'], ['foo', 'bar']);
		a.end();
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle falsy testing of arrays', function (t) {
	ava(function (a) {
		a.notSame(['foo', 'bar'], ['foo', 'bar', 'cat']);
		a.end();
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle testing of objects', function (t) {
	ava(function (a) {
		a.same({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar'});
		a.end();
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle falsy testing of objects', function (t) {
	ava(function (a) {
		a.notSame({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar', cat: 'cake'});
		a.end();
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle throws with error', function (t) {
	ava(function (a) {
		a.throws(function () {
			throw new Error('foo');
		});

		a.end();
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle throws without error', function (t) {
	ava(function (a) {
		a.throws(function () {
			return;
		});

		a.end();
	}).run().catch(function (err) {
		t.true(err);
		t.end();
	});
});

test('handle throws with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		a.throws(promise);
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle throws with long running rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = new Promise(function (resolve, reject) {
			setTimeout(function () {
				reject(new Error('abc'));
			}, 2000);
		});

		a.throws(promise, /abc/);
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle throws with resolved promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve();
		a.throws(promise);
	}).run().catch(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		a.throws(promise, /abc/);
	}).run().then(function (a) {
		t.false(a.assertionError);
		t.end();
	});
});

test('handle throws with string', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		a.throws(promise, 'abc');
	}).run().then(function (a) {
		t.false(a.assertionError);
		t.end();
	});
});

test('handle throws with false-positive promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve(new Error());
		a.throws(promise);
	}).run().catch(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle doesNotThrow with error', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			throw new Error('foo');
		});

		a.end();
	}).run().catch(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle doesNotThrow without error', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			return;
		});

		a.end();
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle doesNotThrow with resolved promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve();
		a.doesNotThrow(promise);
	}).run().then(function (a) {
		t.false(a.assertError);
		t.end();
	});
});

test('handle doesNotThrow with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		a.doesNotThrow(promise);
	}).run().catch(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('run functions after last planned assertion', function (t) {
	var i = 0;

	ava(function (a) {
		a.plan(1);
		a.pass();
		i++;
	}).run().then(function () {
		t.is(i, 1);
		t.end();
	});
});

test('run async functions after last planned assertion', function (t) {
	var i = 0;

	ava(function (a) {
		a.plan(1);

		function foo(cb) {
			a.pass();
			cb();
		}

		foo(function () {
			i++;
		});
	}).run().then(function () {
		t.is(i, 1);
		t.end();
	});
});

test('planned async assertion', function (t) {
	ava(function (a) {
		a.plan(1);

		setTimeout(function () {
			a.pass();
		}, 100);
	}).run().then(function (a) {
		t.error(a.assertError);
		t.end();
	});
});

test('async assertion with `.end()`', function (t) {
	ava(function (a) {
		setTimeout(function () {
			a.pass();
			a.end();
		}, 100);
	}).run().then(function (a) {
		t.error(a.assertError);
		t.end();
	});
});

test('more assertions than planned should emit an assertion error', function (t) {
	ava(function (a) {
		a.plan(1);
		a.pass();
		a.pass();
	}).run().catch(function (err) {
		t.true(err, err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('runner have test event', function (t) {
	var runner = new Runner();

	runner.addTest(function foo(a) {
		a.end();
	});

	runner.on('test', function (err, title, duration) {
		t.error(err);
		t.equal(title, 'foo');
		t.ok(duration !== undefined);
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

function promisePass() {
	return new Promise(function (resolve) {
		setImmediate(resolve);
	});
}

function promiseFail() {
	return new Promise(function (resolve, reject) {
		setImmediate(function () {
			reject(new Error('unicorn'));
		});
	});
}

test('promise support - assert pass', function (t) {
	ava(function (a) {
		return promisePass().then(function () {
			a.pass();
		});
	}).run().then(function (a) {
		t.is(a.assertCount, 1);
		t.end();
	});
});

test('promise support - assert fail', function (t) {
	ava(function (a) {
		return promisePass().then(function () {
			a.fail();
		});
	}).run().catch(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('promise support - reject', function (t) {
	ava(function (a) {
		return promiseFail().then(function () {
			a.pass();
		});
	}).run().catch(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('record test duration', function (t) {
	ava(function (a) {
		a.plan(1);

		setTimeout(function () {
			a.true(true);
		}, 1234);
	}).run().then(function (a) {
		t.true(a.duration >= 1234);
		t.end();
	});
});

test('hooks - before', function (t) {
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

test('hooks - after', function (t) {
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

test('hooks - stop if before hooks failed', function (t) {
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

test('hooks - before each with concurrent tests', function (t) {
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

test('hooks - before each with serial tests', function (t) {
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

test('hooks - fail if beforeEach hook fails', function (t) {
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

test('hooks - after each with concurrent tests', function (t) {
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

test('hooks - after each with serial tests', function (t) {
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

test('hooks - ensure hooks run only around tests', function (t) {
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

test('hooks - shared context', function (t) {
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

test('hooks - shared context of any type', function (t) {
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

test('ES2015 support', function (t) {
	t.plan(1);

	execCli('fixture/es2015.js', function (err) {
		t.ifError(err);
	});
});

test('generators support', function (t) {
	t.plan(1);

	execCli('fixture/generators.js', function (err) {
		t.ifError(err);
	});
});

test('async/await support', function (t) {
	t.plan(1);

	execCli('fixture/async-await.js', function (err) {
		t.ifError(err);
	});
});

test('wait for test to end', function (t) {
	var avaTest;

	ava(function (a) {
		a.plan(1);

		avaTest = a;
	}).run().then(function (a) {
		t.is(a.planCount, 1);
		t.is(a.assertCount, 1);
		t.true(a.duration >= 1234);
		t.end();
	});

	setTimeout(function () {
		avaTest.pass();
	}, 1234);
});

test('display test title prefixes', function (t) {
	t.plan(6);

	execCli(['fixture/async-await.js', 'fixture/es2015.js', 'fixture/generators.js'], function (err, stdout, stderr) {
		t.ifError(err);

		// remove everything except test list
		var output = stderr
			.replace(/[0-9] tests passed/, '')
			.replace(new RegExp(figures.tick, 'gm'), '')
			.replace(/^\s+/gm, '')
			.trim();

		var separator = ' ' + figures.pointerSmall + ' ';

		// expected output
		var tests = [
			['async-await', 'async function'].join(separator),
			['async-await', 'arrow async function'].join(separator),
			['generators', 'generator function'].join(separator),
			['es2015', '[anonymous]'].join(separator)
		];

		// check if each line in actual output
		// exists in expected output
		output.split('\n').forEach(function (line) {
			var index = tests.indexOf(line);

			t.true(index >= 0);

			// remove line from expected output
			tests.splice(index, 1);
		});

		// if all lines were removed from expected output
		// actual output matches expected output
		t.is(tests.length, 0);
	});
});

test('don\'t display test title, if there is only one anonymous test', function (t) {
	t.plan(2);

	execCli(['fixture/es2015.js'], function (err, stdout, stderr) {
		t.ifError(err);

		t.is(stderr.trim(), '1 test passed');
		t.end();
	});
});

test('fail-fast mode', function (t) {
	t.plan(5);

	execCli(['fixture/fail-fast.js', '--fail-fast'], function (err, stdout, stderr) {
		t.ok(err);
		t.is(err.code, 1);

		t.true(stderr.indexOf(figures.cross + ' [anonymous] false fail false') !== -1);
		t.true(stderr.indexOf(figures.tick + ' [anonymous]') === -1);
		t.true(stderr.indexOf('1 test failed') !== -1);
		t.end();
	});
});

test('serial execution mode', function (t) {
	t.plan(1);

	execCli(['fixture/serial.js', '--serial'], function (err) {
		t.ifError(err);
		t.end();
	});
});

test('power-assert support', function (t) {
	t.plan(2);

	execCli('fixture/power-assert.js', function (err, stdout, stderr) {
		t.ok(err);

		// t.ok(a === 'bar')
		//      |
		//      "foo"
		t.true((/t\.ok\(a === 'bar'\)\s*\n\s+\|\s*\n\s+"foo"/m).test(stderr));
	});
});

test('change process.cwd() to a test\'s directory', function (t) {
	t.plan(1);

	execCli('fixture/process-cwd.js', function (err) {
		t.ifError(err);
		t.end();
	});
});

test('Babel require hook only applies to the test file', function (t) {
	execCli('fixture/babel-hook.js', function (err) {
		t.ok(err);
		t.is(err.code, 1);
		t.end();
	});
});

test('absolute paths in CLI', function (t) {
	t.plan(2);

	execCli([path.resolve('.', 'test/fixture/es2015.js')], function (err, stdout, stderr) {
		t.ifError(err);
		t.is(stderr.trim(), '1 test passed');
		t.end();
	});
});
