'use strict';
const test = require('tap').test;
const delay = require('delay');
const isPromise = require('is-promise');
const formatValue = require('../lib/format-assert-error').formatValue;
const Test = require('../lib/test');

const failingTestHint = 'Test was expected to fail, but succeeded, you should stop marking the test as failing';
const noop = () => {};

function ava(fn, contextRef, onResult) {
	return new Test({type: 'test', callback: false}, '[anonymous]', fn, true, contextRef, onResult || noop);
}

ava.failing = (fn, contextRef, onResult) => {
	return new Test({type: 'test', callback: false, failing: true}, '[anonymous]', fn, true, contextRef, onResult || noop);
};

ava.cb = (fn, contextRef, onResult) => {
	return new Test({type: 'test', callback: true}, '[anonymous]', fn, true, contextRef, onResult || noop);
};

ava.cb.failing = (fn, contextRef, onResult) => {
	return new Test({type: 'test', callback: true, failing: true}, '[anonymous]', fn, true, contextRef, onResult || noop);
};

test('run test', t => {
	const passed = ava(a => {
		a.fail();
	}).run();

	t.is(passed, false);
	t.end();
});

test('multiple asserts', t => {
	let result;
	const passed = ava(a => {
		a.pass();
		a.pass();
		a.pass();
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, true);
	t.is(result.result.assertCount, 3);
	t.end();
});

test('plan assertions', t => {
	let result;
	const passed = ava(a => {
		a.plan(2);
		a.pass();
		a.pass();
	}, null, r => {
		result = r;
	}).run();
	t.is(passed, true);
	t.is(result.result.planCount, 2);
	t.is(result.result.assertCount, 2);
	t.end();
});

test('run more assertions than planned', t => {
	let result;
	const passed = ava(a => {
		a.plan(2);
		a.pass();
		a.pass();
		a.pass();
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.ok(result.reason);
	t.match(result.reason.message, /Planned for 2 assertions, but got 3\./);
	t.is(result.reason.name, 'AssertionError');
	t.end();
});

test('fails if no assertions are run', t => {
	let result;
	const passed = ava(() => {}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.ok(result.reason);
	t.is(result.reason.name, 'Error');
	t.match(result.reason.message, /Test finished without running any assertions/);
	t.end();
});

test('fails if no assertions are run, unless so planned', t => {
	const passed = ava(a => a.plan(0)).run();
	t.is(passed, true);
	t.end();
});

test('fails if no assertions are run, unless an ended callback test', t => {
	const passed = ava.cb(a => a.end()).run();
	t.is(passed, true);
	t.end();
});

test('wrap non-assertion errors', t => {
	const err = new Error();
	let result;
	const passed = ava(() => {
		throw err;
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(err)}]);
	t.end();
});

test('end can be used as callback without maintaining thisArg', t => {
	ava.cb(a => {
		a.pass();
		setTimeout(a.end);
	}).run().then(passed => {
		t.is(passed, true);
		t.end();
	});
});

test('end can be used as callback with error', t => {
	const err = new Error('failed');
	let result;
	const passed = ava.cb(a => {
		a.end(err);
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.message, 'Callback called with an error');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(err)}]);
	t.end();
});

test('end can be used as callback with a non-error as its error argument', t => {
	const nonError = {foo: 'bar'};
	let result;
	const passed = ava.cb(a => {
		a.end(nonError);
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.ok(result.reason);
	t.is(result.reason.message, 'Callback called with an error');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(nonError)}]);
	t.end();
});

test('handle non-assertion errors even when planned', t => {
	const err = new Error('bar');
	let result;
	const passed = ava(a => {
		a.plan(1);
		throw err;
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.name, 'AssertionError');
	t.is(result.reason.message, 'Error thrown in test');
	t.end();
});

test('handle testing of arrays', t => {
	let result;
	const passed = ava(a => {
		a.deepEqual(['foo', 'bar'], ['foo', 'bar']);
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('handle falsy testing of arrays', t => {
	let result;
	const passed = ava(a => {
		a.notDeepEqual(['foo', 'bar'], ['foo', 'bar', 'cat']);
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('handle testing of objects', t => {
	let result;
	const passed = ava(a => {
		a.deepEqual({
			foo: 'foo',
			bar: 'bar'
		}, {
			foo: 'foo',
			bar: 'bar'
		});
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('handle falsy testing of objects', t => {
	let result;
	const passed = ava(a => {
		a.notDeepEqual({
			foo: 'foo',
			bar: 'bar'
		}, {
			foo: 'foo',
			bar: 'bar',
			cat: 'cake'
		});
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, true);
	t.is(result.result.assertCount, 1);
	t.end();
});

test('planned async assertion', t => {
	let result;
	ava.cb(a => {
		a.plan(1);

		setTimeout(() => {
			a.pass();
			a.end();
		}, 100);
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('async assertion with `.end()`', t => {
	let result;
	ava.cb(a => {
		setTimeout(() => {
			a.pass();
			a.end();
		}, 100);
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('more assertions than planned should emit an assertion error', t => {
	let result;
	const passed = ava(a => {
		a.plan(1);
		a.pass();
		a.pass();
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.name, 'AssertionError');
	t.end();
});

test('record test duration', t => {
	let result;
	ava.cb(a => {
		a.plan(1);

		setTimeout(() => {
			a.true(true);
			a.end();
		}, 1234);
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.true(result.result.duration >= 1000);
		t.end();
	});
});

test('wait for test to end', t => {
	let avaTest;

	let result;
	ava.cb(a => {
		a.plan(1);

		avaTest = a;
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.true(result.result.duration >= 1000);
		t.end();
	});

	setTimeout(() => {
		avaTest.pass();
		avaTest.end();
	}, 1234);
});

test('fails with the first assertError', t => {
	let result;
	const passed = ava(a => {
		a.plan(2);
		a.is(1, 2);
		a.is(3, 4);
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [
		{label: 'Actual:', formatted: formatValue(1)},
		{label: 'Must be strictly equal to:', formatted: formatValue(2)}
	]);
	t.end();
});

test('fails with thrown falsy value', t => {
	let result;
	const passed = ava(() => {
		throw 0; // eslint-disable-line no-throw-literal
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(0)}]);
	t.end();
});

test('fails with thrown non-error object', t => {
	const obj = {foo: 'bar'};
	let result;
	const passed = ava(() => {
		throw obj;
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.same(result.reason.values, [{label: 'Error:', formatted: formatValue(obj)}]);
	t.end();
});

test('skipped assertions count towards the plan', t => {
	let result;
	const passed = ava(a => {
		a.plan(2);
		a.pass();
		a.skip.fail();
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, true);
	t.is(result.result.planCount, 2);
	t.is(result.result.assertCount, 2);
	t.end();
});

test('throws and notThrows work with promises', t => {
	let asyncCalled = false;
	let result;
	ava(a => {
		a.plan(2);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.notThrows(delay(20).then(() => {
			asyncCalled = true;
		}));
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 2);
		t.is(result.result.assertCount, 2);
		t.is(asyncCalled, true);
		t.end();
	});
});

test('end should not be called multiple times', t => {
	let result;
	const passed = ava.cb(a => {
		a.pass();
		a.end();
		a.end();
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.message, '`t.end()` called more than once');
	t.end();
});

test('cb test that throws sync', t => {
	let result;
	const err = new Error('foo');
	const passed = ava.cb(() => {
		throw err;
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.message, 'Error thrown in test');
	t.is(result.reason.name, 'AssertionError');
	t.end();
});

test('waits for t.throws to resolve after t.end is called', t => {
	let result;
	ava.cb(a => {
		a.plan(1);
		a.notThrows(delay(10), 'foo');
		a.end();
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('waits for t.throws to reject after t.end is called', t => {
	let result;
	ava.cb(a => {
		a.plan(1);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.end();
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('waits for t.throws to resolve after the promise returned from the test resolves', t => {
	let result;
	ava(a => {
		a.plan(1);
		a.notThrows(delay(10), 'foo');
		return Promise.resolve();
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('waits for t.throws to reject after the promise returned from the test resolves', t => {
	let result;
	ava(a => {
		a.plan(1);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		return Promise.resolve();
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 1);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('multiple resolving and rejecting promises passed to t.throws/t.notThrows', t => {
	let result;
	ava(a => {
		a.plan(6);
		for (let i = 0; i < 3; i++) {
			a.throws(delay.reject(10, new Error('foo')), 'foo');
			a.notThrows(delay(10), 'foo');
		}
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 6);
		t.is(result.result.assertCount, 6);
		t.end();
	});
});

test('number of assertions matches t.plan when the test exits, but before all pending assertions resolve another is added', t => {
	let result;
	ava(a => {
		a.plan(2);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.notThrows(delay(10), 'foo');
		setTimeout(() => {
			a.pass();
		}, 5);
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.match(result.reason.message, /Assertion passed, but test has already ended/);
		t.is(result.reason.name, 'Error');
		t.end();
	});
});

test('number of assertions matches t.plan when the test exits, but before all pending assertions resolve, a failing assertion is added', t => {
	let result;
	ava(a => {
		a.plan(2);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.notThrows(delay(10), 'foo');
		setTimeout(() => {
			a.fail();
		}, 5);
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.match(result.reason.message, /Assertion failed, but test has already ended/);
		t.is(result.reason.name, 'Error');
		t.end();
	});
});

test('number of assertions doesn\'t match plan when the test exits, but before all promises resolve another is added', t => {
	let result;
	const passed = ava(a => {
		a.plan(3);
		a.throws(delay.reject(10, new Error('foo')), 'foo');
		a.notThrows(delay(10), 'foo');
		setTimeout(() => {
			a.throws(Promise.reject(new Error('foo')), 'foo');
		}, 5);
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.assertion, 'plan');
	t.is(result.reason.operator, '===');
	t.end();
});

test('assertions return promises', t => {
	ava(a => {
		a.plan(2);
		t.ok(isPromise(a.throws(Promise.reject(new Error('foo')))));
		t.ok(isPromise(a.notThrows(Promise.resolve(true))));
	}).run().then(passed => {
		t.is(passed, true);
		t.end();
	});
});

test('contextRef', t => {
	new Test({type: 'test'}, 'foo',
		a => {
			a.pass();
			t.strictDeepEqual(a.context, {foo: 'bar'});
			t.end();
		},
		true,
		{context: {foo: 'bar'}},
		() => {}
	).run();
});

test('it is an error to set context in a hook', t => {
	let result;
	const avaTest = ava(a => {
		a.context = 'foo';
	}, null, r => {
		result = r;
	});
	avaTest.metadata.type = 'foo';

	const passed = avaTest.run();
	t.is(passed, false);
	t.match(result.reason.message, /`t\.context` is not available in foo tests/);
	t.end();
});

test('failing tests should fail', t => {
	const passed = ava.failing('foo', a => {
		a.fail();
	}).run();

	t.is(passed, true);
	t.end();
});

test('failing callback tests should end without error', t => {
	const err = new Error('failed');
	const passed = ava.cb.failing(a => {
		a.end(err);
	}).run();

	t.is(passed, true);
	t.end();
});

test('failing tests must not pass', t => {
	let result;
	const passed = ava.failing(a => {
		a.pass();
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.message, failingTestHint);
	t.end();
});

test('failing callback tests must not pass', t => {
	const passed = ava.cb.failing(a => {
		a.pass();
		a.end();
	}).run();

	t.is(passed, false);
	t.end();
});

test('failing tests must not return a fulfilled promise', t => {
	let result;
	ava.failing(a => {
		return Promise.resolve()
			.then(() => {
				a.pass();
			});
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.message, failingTestHint);
		t.end();
	});
});

test('failing tests pass when returning a rejected promise', t => {
	ava.failing(a => {
		a.plan(1);
		a.notThrows(delay(10), 'foo');
		return Promise.reject();
	}).run().then(passed => {
		t.is(passed, true);
		t.end();
	});
});

test('failing tests pass with `t.throws(nonThrowingPromise)`', t => {
	ava.failing(a => {
		a.throws(Promise.resolve(10));
	}).run().then(passed => {
		t.is(passed, true);
		t.end();
	});
});

test('failing tests fail with `t.notThrows(throws)`', t => {
	let result;
	ava.failing(a => {
		a.notThrows(Promise.resolve('foo'));
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.message, failingTestHint);
		t.end();
	});
});
