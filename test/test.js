'use strict';
var test = require('tape');
var Promise = require('bluebird');
var execFile = require('child_process').execFile;
var ava = require('../lib/test');
var Runner = require('../lib/runner');

test('run test', function (t) {
	ava('foo', function (a) {
		a.true(false);
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
		a.true(true);
		a.true(true);
		a.true(true);
		a.end();
	}).run().then(function (a) {
		t.is(a.assertCount, 3);
		t.end();
	});
});

test('plan assertions', function (t) {
	ava(function (a) {
		a.plan(2);
		a.true(true);
		a.true(true);
	}).run().then(function (a) {
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
		t.end();
	});
});

test('run more assertions than planned', function (t) {
	ava(function (a) {
		a.plan(2);
		a.true(true);
		a.true(true);
		a.true(true);
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

test('handle throws', function (t) {
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

test('handle throws with error', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			throw new Error('foo');
		});

		a.end();
	}).run().catch(function (err) {
		t.true(err);
		t.end();
	});
});

test('handle falsy throws', function (t) {
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

test('handle falsy throws with error', function (t) {
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

test('run functions after last planned assertion', function (t) {
	var i = 0;

	ava(function (a) {
		a.plan(1);
		a.true(true);
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
			a.true(true);
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

// NOTE(sindresorhus): I don't think this is possible as we won't know when the last assertion will happen, it could be minutes.
// Might be able to check `process._getActiveHandles().length === 1 && process._getActiveRequests().length === 0` or something.
test.skip('more assertions than planned should emit an assertion error - async', function (t) {
	ava(function (a) {
		a.plan(1);
		a.pass();

		setTimeout(function () {
			a.pass();
		}, 100);
	}).run(function (err) {
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
			// TODO: replace with `a.fail()` when it's available
			a.true(false);
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

test('ES2015 support', function (t) {
	t.plan(2);

	execFile('../cli.js', ['es2015.js'], {
		cwd: __dirname
	}, function (err, stdout, stderr) {
		t.true(err);
		t.true(stderr.trim().length > 0);
	});
});
