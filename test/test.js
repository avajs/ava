'use strict';
var test = require('tap').test;
var _ava = require('../lib/test');

function delay(val, time) {
	return new Promise(function (resolve) {
		setTimeout(function () {
			resolve(val);
		}, time);
	});
}

function ava() {
	var t = _ava.apply(null, arguments);
	t.metadata = {callback: false};
	return t;
}

ava.cb = function () {
	var t = _ava.apply(null, arguments);
	t.metadata = {callback: true};
	return t;
};

test('run test', function (t) {
	ava('foo', function (a) {
		a.fail();
		a.end();
	}).run().catch(function (err) {
		t.ok(err);
		t.end();
	});
});

test('title is optional', function (t) {
	ava(function (a) {
		a.pass();
	}).run().then(function (a) {
		t.is(a.title, '[anonymous]');
		t.end();
	});
});

test('callback is required', function (t) {
	t.throws(function () {
		ava();
	}, /you must provide a callback/);

	t.throws(function () {
		ava('title');
	}, /you must provide a callback/);

	t.end();
});

test('infer name from function', function (t) {
	ava(function foo(a) {
		a.pass();
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

test('run more assertions than planned', function (t) {
	ava(function (a) {
		a.plan(2);
		a.pass();
		a.pass();
		a.pass();
	}).run().catch(function (err) {
		t.ok(err);
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

test('end can be used as callback without maintaining thisArg', function (t) {
	ava.cb(function (a) {
		setTimeout(a.end);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('end can be used as callback with error', function (t) {
	ava(function (a) {
		a.end(new Error('failed'));
	}).run().catch(function (err) {
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
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle falsy testing of arrays', function (t) {
	ava(function (a) {
		a.notSame(['foo', 'bar'], ['foo', 'bar', 'cat']);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle testing of objects', function (t) {
	ava(function (a) {
		a.same({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar'});
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle falsy testing of objects', function (t) {
	ava(function (a) {
		a.notSame({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar', cat: 'cake'});
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle throws with error', function (t) {
	ava(function (a) {
		a.throws(function () {
			throw new Error('foo');
		});
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle throws without error', function (t) {
	ava(function (a) {
		a.throws(function () {
			return;
		});
	}).run().catch(function (err) {
		t.ok(err);
		t.end();
	});
});

test('handle doesNotThrow with error', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			throw new Error('foo');
		});
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle doesNotThrow without error', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			return;
		});
	}).run().then(function (a) {
		t.notOk(a.assertError);
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

	ava.cb(function (a) {
		a.plan(1);
		a.pass();
		a.end();
		i++;
	}).run().then(function () {
		t.is(i, 1);
		t.end();
	});
});

test('planned async assertion', function (t) {
	ava.cb(function (a) {
		a.plan(1);

		setTimeout(function () {
			a.pass();
			a.end();
		}, 100);
	}).run().then(function (a) {
		t.ifError(a.assertError);
		t.end();
	});
});

test('async assertion with `.end()`', function (t) {
	ava.cb(function (a) {
		setTimeout(function () {
			a.pass();
			a.end();
		}, 100);
	}).run().then(function (a) {
		t.ifError(a.assertError);
		t.end();
	});
});

test('more assertions than planned should emit an assertion error', function (t) {
	ava(function (a) {
		a.plan(1);
		a.pass();
		a.pass();
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('record test duration', function (t) {
	ava.cb(function (a) {
		a.plan(1);

		setTimeout(function () {
			a.true(true);
			a.end();
		}, 1234);
	}).run().then(function (a) {
		t.true(a.duration >= 1234);
		t.end();
	});
});

test('wait for test to end', function (t) {
	var avaTest;

	ava.cb(function (a) {
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
		avaTest.end();
	}, 1234);
});

test('fails with the first assertError', function (t) {
	ava(function (a) {
		a.plan(2);
		a.is(1, 2);
		a.is(3, 4);
	}).run().catch(function (err) {
		t.is(err.actual, 1);
		t.is(err.expected, 2);
		t.end();
	});
});

test('fails with thrown falsy value', function (t) {
	ava(function () {
		throw 0; // eslint-disable-line no-throw-literal
	}).run().catch(function (err) {
		t.equal(err, 0);
		t.end();
	});
});

test('throwing undefined will be converted to string "undefined"', function (t) {
	ava(function () {
		throw undefined; // eslint-disable-line no-throw-literal
	}).run().catch(function (err) {
		t.equal(err, 'undefined');
		t.end();
	});
});

test('skipped assertions count towards the plan', function (t) {
	ava(function (a) {
		a.plan(2);
		a.pass();
		a.skip.fail();
	}).run().then(function (a) {
		t.ifError(a.assertError);
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
		t.end();
	});
});

test('throws and doesNotThrow work with promises', function (t) {
	var asyncCalled = false;
	ava(function (a) {
		a.plan(2);
		a.throws(delay(Promise.reject(new Error('foo')), 10), 'foo');
		a.doesNotThrow(delay(Promise.resolve().then(function () {
			asyncCalled = true;
		}), 20));
	}).run().then(function (a) {
		t.ifError(a.assertError);
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
		t.is(asyncCalled, true);
		t.end();
	});
});
