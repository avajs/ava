'use strict';
var test = require('tape');
var ava = require('../lib/test');
var Runner = require('../lib/runner');

test('run test', function (t) {
	ava('foo', function (a) {
		a.true(false);
		a.end();
	}).run(function (err) {
		t.true(err);
		t.end();
	});
});

test('test title is optional', function (t) {
	ava(function (a) {
		a.end();
	}).run(function () {
		t.is(this.title, '[anonymous]');
		t.end();
	});
});

test('infer test name from function', function (t) {
	ava(function foo(a) {
		a.end();
	}).run(function () {
		t.is(this.title, 'foo');
		t.end();
	});
});

test('multiple asserts', function (t) {
	ava(function (a) {
		a.true(true);
		a.true(true);
		a.true(true);
		a.end();
	}).run(function () {
		t.is(this.assertCount, 3);
		t.end();
	});
});

test('plan assertions', function (t) {
	ava(function (a) {
		a.plan(2);
		a.true(true);
		a.true(true);
	}).run(function () {
		t.is(this.planCount, 2);
		t.is(this.assertCount, 2);
		t.end();
	});
});

test('run more assertions than planned', function (t) {
	ava(function (a) {
		a.plan(2);
		a.true(true);
		a.true(true);
		a.true(true);
	}).run(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle non-assertion errors', function (t) {
	ava(function () {
		throw new Error();
	}).run(function (err) {
		t.is(err.name, 'Error');
		t.true(err instanceof Error);
		t.end();
	});
});

test('handle testing of arrays', function (t) {
	ava(function (a) {
		a.same(['foo', 'bar'], ['foo', 'bar']);
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle falsy testing of arrays', function (t) {
	ava(function (a) {
		a.notSame(['foo', 'bar'], ['foo', 'bar', 'cat']);
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle testing of objects', function (t) {
	ava(function (a) {
		a.same({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar'});
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle falsy testing of objects', function (t) {
	ava(function (a) {
		a.notSame({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar', cat: 'cake'});
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle throws', function (t) {
	ava(function (a) {
		a.throws(function () {
			throw new Error('foo');
		});

		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle throws with error', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			throw new Error('foo');
		});

		a.end();
	}).run(function (err) {
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
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle falsy throws with error', function (t) {
	ava(function (a) {
		a.throws(function () {
			return;
		});

		a.end();
	}).run(function (err) {
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
	}).run(function () {
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
	}).run(function () {
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
	}).run(function (err) {
		t.error(err);
		t.end();
	});
});

test('async assertion with `.end()`', function (t) {
	ava(function (a) {
		setTimeout(function () {
			a.pass();
			a.end();
		}, 100);
	}).run(function (err) {
		t.error(err);
		t.end();
	});
});

test('more assertions than planned should emit an assertion error', function (t) {
	ava(function (a) {
		a.plan(1);
		a.pass();
		a.pass();
	}).run(function (err) {
		t.true(err, err);
		t.end();
	});
});

test('more assertions than planned should emit an assertion error - async', function (t) {
	ava(function (a) {
		a.plan(1);
		a.pass();

		setTimeout(function () {
			a.pass();
		}, 100);
	}).run(function (err) {
		t.true(err, err);
		t.end();
	});
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

	runner.run(function () {
		t.same(arr, ['a', 'b', 'c']);
		t.end();
	});
});

test('throwing in a test should emit the error', function (t) {
	ava(function (a) {
		throw new Error('unicorn');
	}).run(function (err) {
		t.is(err.message, 'unicornn');
		t.end();
	});
});
