'use strict';
const test = require('tap').test;
const delay = require('delay');
const isPromise = require('is-promise');
const formatValue = require('../lib/format-assert-error').formatValue;
const Test = require('../lib/test');

const failingTestHint = 'Test was expected to fail, but succeeded, you should stop marking the test as failing';

function ava(title, fn, contextRef, report) {
	const t = new Test(title, fn, contextRef, report);

	t.metadata = {
		callback: false
	};

	return t;
}

ava.failing = (title, fn, contextRef, report) => {
	const t = new Test(title, fn, contextRef, report);

	t.metadata = {
		callback: false,
		failing: true
	};

	return t;
};

ava.cb = (title, fn, contextRef, report) => {
	const t = new Test(title, fn, contextRef, report);

	t.metadata = {
		callback: true
	};

	return t;
};

ava.cb.failing = (title, fn, contextRef, report) => {
	const t = new Test(title, fn, contextRef, report);

	t.metadata = {
		callback: true,
		failing: true
	};

	return t;
};

test('run test', t => {
	const result = ava('foo', a => {
		a.fail();
	}).run();

	t.is(result.passed, false);
	t.end();
});

test('title is optional', t => {
	const result = ava(a => {
		a.pass();
	}).run();

	t.is(result.passed, true);
	t.is(result.result.title, '[anonymous]');
	t.end();
});

test('callback is required', t => {
	t.throws(() => {
		ava();
	}, /You must provide a callback/);

	t.throws(() => {
		ava('title');
	}, /You must provide a callback/);

	t.end();
});

test('infer name from function', t => {
	const result = ava(function foo(a) { // eslint-disable-line func-names, prefer-arrow-callback
		a.pass();
	}).run();

	t.is(result.passed, true);
	t.is(result.result.title, 'foo');
	t.end();
});

test('multiple asserts', t => {
	const result = ava(a => {
		a.pass();
		a.pass();
		a.pass();
	}).run();

	t.is(result.passed, true);
	t.is(result.result.assertCount, 3);
	t.end();
});

test('plan assertions', t => {
	const result = ava(a => {
		a.plan(2);
		a.pass();
		a.pass();
	}).run();
	t.is(result.passed, true);
	t.is(result.result.planCount, 2);
	t.is(result.result.assertCount, 2);
	t.end();
});

test('run more assertions than planned', t => {
	const result = ava(a => {
		a.plan(2);
		a.pass();
		a.pass();
		a.pass();
	}).run();

	t.is(result.passed, false);
	t.ok(result.reason);
	t.match(result.reason.message, /Planned for 2 assertions, but got 3\./);
	t.is(result.reason.name, 'AssertionError');
	t.end();
});

test('wrap non-assertion errors', t => {
	const err = new Error();
	const result = ava(() => {
		throw err;
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(err)}]);
	t.end();
});

test('end can be used as callback without maintaining thisArg', t => {
	ava.cb(a => {
		setTimeout(a.end);
	}).run().then(result => {
		t.is(result.passed, true);
		t.end();
	});
});

test('end can be used as callback with error', t => {
	const err = new Error('failed');
	ava.cb(a => {
		a.end(err);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.message, 'Callback called with an error');
		t.is(result.reason.name, 'AssertionError');
		t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(err)}]);
		t.end();
	});
});

test('end can be used as callback with a non-error as its error argument', t => {
	const nonError = {foo: 'bar'};
	ava.cb(a => {
		a.end(nonError);
	}).run().then(result => {
		t.is(result.passed, false);
		t.ok(result.reason);
		t.is(result.reason.message, 'Callback called with an error');
		t.is(result.reason.name, 'AssertionError');
		t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(nonError)}]);
		t.end();
	});
});

test('handle non-assertion errors even when planned', t => {
	const err = new Error('bar');
	const result = ava(a => {
		a.plan(1);
		throw err;
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.name, 'AssertionError');
	t.is(result.reason.message, 'Error thrown in test');
	t.end();
});

test('handle testing of arrays', t => {
	const result = ava(a => {
		a.deepEqual(['foo', 'bar'], ['foo', 'bar']);
	}).run();

	t.is(result.passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('handle falsy testing of arrays', t => {
	const result = ava(a => {
		a.notDeepEqual(['foo', 'bar'], ['foo', 'bar', 'cat']);
	}).run();

	t.is(result.passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('handle testing of objects', t => {
	const result = ava(a => {
		a.deepEqual({
			foo: 'foo',
			bar: 'bar'
		}, {
			foo: 'foo',
			bar: 'bar'
		});
	}).run();

	t.is(result.passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('handle falsy testing of objects', t => {
	const result = ava(a => {
		a.notDeepEqual({
			foo: 'foo',
			bar: 'bar'
		}, {
			foo: 'foo',
			bar: 'bar',
			cat: 'cake'
		});
	}).run();

	t.is(result.passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('run functions after last planned assertion', t => {
	let i = 0;

	const result = ava(a => {
		a.plan(1);
		a.pass();
		i++;
	}).run();

	t.is(i, 1);
	t.is(result.passed, true);
	t.end();
});

test('run async functions after last planned assertion', t => {
	let i = 0;

	ava.cb(a => {
		a.plan(1);
		a.pass();
		a.end();
		i++;
	}).run().then(result => {
		t.is(i, 1);
		t.is(result.passed, true);
		t.end();
	});
});

test('planned async assertion', t => {
	ava.cb(a => {
		a.plan(1);

		setTimeout(() => {
			a.pass();
			a.end();
		}, 100);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('async assertion with `.end()`', t => {
	ava.cb(a => {
		setTimeout(() => {
			a.pass();
			a.end();
		}, 100);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('more assertions than planned should emit an assertion error', t => {
	const result = ava(a => {
		a.plan(1);
		a.pass();
		a.pass();
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.name, 'AssertionError');
	t.end();
});

test('record test duration', t => {
	ava.cb(a => {
		a.plan(1);

		setTimeout(() => {
			a.true(true);
			a.end();
		}, 1234);
	}).run().then(result => {
		t.is(result.passed, true);
		t.true(result.result.duration >= 1234);
		t.end();
	});
});

test('wait for test to end', t => {
	let avaTest;

	ava.cb(a => {
		a.plan(1);

		avaTest = a;
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.true(result.result.duration >= 1234);
		t.end();
	});

	setTimeout(() => {
		avaTest.pass();
		avaTest.end();
	}, 1234);
});

test('fails with the first assertError', t => {
	const result = ava(a => {
		a.plan(2);
		a.is(1, 2);
		a.is(3, 4);
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [
		{label: 'Actual:', formatted: formatValue(1)},
		{label: 'Must be strictly equal to:', formatted: formatValue(2)}
	]);
	t.end();
});

test('fails with thrown falsy value', t => {
	const result = ava(() => {
		throw 0; // eslint-disable-line no-throw-literal
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(0)}]);
	t.end();
});

test('fails with thrown non-error object', t => {
	const obj = {foo: 'bar'};
	const result = ava(() => {
		throw obj;
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(obj)}]);
	t.end();
});

test('skipped assertions count towards the plan', t => {
	const result = ava(a => {
		a.plan(2);
		a.pass();
		a.skip.fail();
	}).run();

	t.is(result.passed, true);
	t.is(result.result.planCount, 2);
	t.is(result.result.assertCount, 2);
	t.end();
});

test('throws and notThrows work with promises', t => {
	let asyncCalled = false;
	ava(a => {
		a.plan(2);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.notThrows(delay(20).then(() => {
			asyncCalled = true;
		}));
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 2);
		t.is(result.result.assertCount, 2);
		t.is(asyncCalled, true);
		t.end();
	});
});

test('end should not be called multiple times', t => {
	ava.cb(a => {
		a.end();
		a.end();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.message, '`t.end()` called more than once');
		t.end();
	});
});

test('cb test that throws sync', t => {
	const err = new Error('foo');
	const result = ava.cb(() => {
		throw err;
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.end();
});

test('waits for t.throws to resolve after t.end is called', t => {
	ava.cb(a => {
		a.plan(1);
		a.notThrows(delay(10), 'foo');
		a.end();
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('waits for t.throws to reject after t.end is called', t => {
	ava.cb(a => {
		a.plan(1);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.end();
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('waits for t.throws to resolve after the promise returned from the test resolves', t => {
	ava(a => {
		a.plan(1);
		a.notThrows(delay(10), 'foo');
		return Promise.resolve();
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('waits for t.throws to reject after the promise returned from the test resolves', t => {
	ava(a => {
		a.plan(1);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		return Promise.resolve();
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('multiple resolving and rejecting promises passed to t.throws/t.notThrows', t => {
	ava(a => {
		a.plan(6);
		for (let i = 0; i < 3; i++) {
			a.throws(delay.reject(10, new Error('foo')), 'foo');
			a.notThrows(delay(10), 'foo');
		}
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 6);
		t.is(result.result.assertCount, 6);
		t.end();
	});
});

test('number of assertions matches t.plan when the test exits, but before all promises resolve another is added', t => {
	ava(a => {
		a.plan(2);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.notThrows(delay(10), 'foo');
		setTimeout(() => {
			a.throws(Promise.reject(new Error('foo')), 'foo');
		}, 5);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.assertion, 'plan');
		t.is(result.reason.operator, '===');
		t.end();
	});
});

test('number of assertions doesn\'t match plan when the test exits, but before all promises resolve another is added', t => {
	ava(a => {
		a.plan(3);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.notThrows(delay(10), 'foo');
		setTimeout(() => {
			a.throws(Promise.reject(new Error('foo')), 'foo');
		}, 5);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.assertion, 'plan');
		t.is(result.reason.operator, '===');
		t.end();
	});
});

test('assertions return promises', t => {
	ava(a => {
		a.plan(2);
		t.ok(isPromise(a.throws(Promise.reject(new Error('foo')))));
		t.ok(isPromise(a.notThrows(Promise.resolve(true))));
	}).run().then(result => {
		t.is(result.passed, true);
		t.end();
	});
});

test('contextRef', t => {
	new Test('foo',
		a => {
			t.strictDeepEqual(a.context, {foo: 'bar'});
			t.end();
		},
		{context: {foo: 'bar'}}
	).run();
});

test('it is an error to set context in a hook', t => {
	const avaTest = ava(a => {
		a.context = 'foo';
	});
	avaTest.metadata.type = 'foo';

	const result = avaTest.run();
	t.is(result.passed, false);
	t.match(result.reason.message, /`t\.context` is not available in foo tests/);
	t.end();
});

test('failing tests should fail', t => {
	const result = ava.failing('foo', a => {
		a.fail();
	}).run();

	t.is(result.passed, true);
	t.end();
});

test('failing callback tests should end without error', t => {
	const err = new Error('failed');
	ava.cb.failing(a => {
		a.end(err);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.reason, undefined);
		t.end();
	});
});

test('failing tests must not pass', t => {
	const result = ava.failing('foo', a => {
		a.pass();
	}).run();

	t.is(result.passed, false);
	t.is(result.reason.message, failingTestHint);
	t.end();
});

test('failing callback tests must not pass', t => {
	ava.cb.failing(a => {
		a.end();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.message, failingTestHint);
		t.end();
	});
});

test('failing tests must not return a fulfilled promise', t => {
	ava.failing(() => {
		return Promise.resolve();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.message, failingTestHint);
		t.end();
	});
});

test('failing tests pass when returning a rejected promise', t => {
	ava.failing(a => {
		a.plan(1);
		a.notThrows(delay(10), 'foo');
		return Promise.reject();
	}).run().then(result => {
		t.is(result.passed, true);
		t.end();
	});
});

test('failing tests pass with `t.throws(nonThrowingPromise)`', t => {
	ava.failing(a => {
		a.throws(Promise.resolve(10));
	}).run().then(result => {
		t.is(result.passed, true);
		t.end();
	});
});

test('failing tests fail with `t.notThrows(throws)`', t => {
	ava.failing(a => {
		a.notThrows(Promise.resolve('foo'));
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.message, failingTestHint);
		t.end();
	});
});
