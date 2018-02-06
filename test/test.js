'use strict';
require('../lib/worker-options').set({color: false});

const test = require('tap').test;
const delay = require('delay');
const Test = require('../lib/test');

const failingTestHint = 'Test was expected to fail, but succeeded, you should stop marking the test as failing';
const noop = () => {};

class ContextRef {
	constructor() {
		this.value = {};
	}
	get() {
		return this.value;
	}
	set(newValue) {
		this.value = newValue;
	}
}

function ava(fn, contextRef, onResult) {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: false},
		onResult: onResult || noop,
		title: '[anonymous]'
	});
}

ava.failing = (fn, contextRef, onResult) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: false, failing: true},
		onResult: onResult || noop,
		title: '[anonymous]'
	});
};

ava.cb = (fn, contextRef, onResult) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: true},
		onResult: onResult || noop,
		title: '[anonymous]'
	});
};

ava.cb.failing = (fn, contextRef, onResult) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: true, failing: true},
		onResult: onResult || noop,
		title: '[anonymous]'
	});
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
	t.is(result.reason.values.length, 1);
	t.is(result.reason.values[0].label, 'Error thrown in test:');
	t.match(result.reason.values[0].formatted, /Error/);
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
	t.is(result.reason.values.length, 1);
	t.is(result.reason.values[0].label, 'Callback called with an error:');
	t.match(result.reason.values[0].formatted, /.*Error.*\n.*message: 'failed'/);
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
	t.is(result.reason.values.length, 1);
	t.is(result.reason.values[0].label, 'Callback called with an error:');
	t.match(result.reason.values[0].formatted, /.*\{.*\n.*foo: 'bar'/);
	t.end();
});

test('title returns the test title', t => {
	t.plan(1);
	new Test({
		fn(a) {
			t.is(a.title, 'foo');
			a.pass();
		},
		metadata: {type: 'test', callback: false},
		onResult: noop,
		title: 'foo'
	}).run();
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
	t.is(result.reason.values.length, 1);
	t.is(result.reason.values[0].label, 'Difference:');
	t.match(result.reason.values[0].formatted, /- 1\n\+ 2/);
	t.end();
});

test('failing pending assertion causes test to fail, not promise rejection', t => {
	let result;
	return ava(a => {
		return a.throws(Promise.resolve())
			.then(() => {
				throw new Error('Should be ignored');
			});
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.notMatch(result.reason.message, /Rejected promise returned by test/);
	});
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
	t.is(result.reason.values.length, 1);
	t.is(result.reason.values[0].label, 'Error thrown in test:');
	t.match(result.reason.values[0].formatted, /0/);
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
	t.is(result.reason.values.length, 1);
	t.is(result.reason.values[0].label, 'Error thrown in test:');
	t.match(result.reason.values[0].formatted, /.*\{.*\n.*foo: 'bar'/);
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
		return Promise.all([
			a.throws(delay.reject(10, new Error('foo')), 'foo'),
			a.notThrows(delay(20).then(() => {
				asyncCalled = true;
			}))
		]);
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

test('multiple resolving and rejecting promises passed to t.throws/t.notThrows', t => {
	let result;
	ava(a => {
		a.plan(6);
		const promises = [];
		for (let i = 0; i < 3; i++) {
			promises.push(
				a.throws(delay.reject(10, new Error('foo')), 'foo'),
				a.notThrows(delay(10), 'foo')
			);
		}
		return Promise.all(promises);
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 6);
		t.is(result.result.assertCount, 6);
		t.end();
	});
});

test('fails if test ends while there are pending assertions', t => {
	let result;
	const passed = ava(a => {
		a.throws(Promise.reject(new Error()));
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.name, 'Error');
	t.match(result.reason.message, /Test finished, but an assertion is still pending/);
	t.end();
});

test('fails if callback test ends while there are pending assertions', t => {
	let result;
	const passed = ava.cb(a => {
		a.throws(Promise.reject(new Error()));
		a.end();
	}, null, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.is(result.reason.name, 'Error');
	t.match(result.reason.message, /Test finished, but an assertion is still pending/);
	t.end();
});

test('fails if async test ends while there are pending assertions', t => {
	let result;
	ava(a => {
		a.throws(Promise.reject(new Error()));
		return Promise.resolve();
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'Error');
		t.match(result.reason.message, /Test finished, but an assertion is still pending/);
		t.end();
	});
});

// This behavior is incorrect, but feedback cannot be provided to the user due to
// https://github.com/avajs/ava/issues/1330
test('no crash when adding assertions after the test has ended', t => {
	t.plan(3);

	ava(a => {
		a.pass();
		setImmediate(() => {
			t.doesNotThrow(() => a.pass());
		});
	}).run();

	ava(a => {
		a.pass();
		setImmediate(() => {
			t.doesNotThrow(() => a.fail());
		});
	}).run();

	ava(a => {
		a.pass();
		setImmediate(() => {
			t.doesNotThrow(() => a.notThrows(Promise.resolve()));
		});
	}).run();
});

test('contextRef', t => {
	new Test({
		contextRef: {
			get() {
				return {foo: 'bar'};
			}
		},
		failWithoutAssertions: true,
		fn(a) {
			a.pass();
			t.strictDeepEqual(a.context, {foo: 'bar'});
			t.end();
		},
		metadata: {type: 'test'},
		onResult() {},
		title: 'foo'
	}).run();
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
		return a.notThrows(delay(10), 'foo')
			.then(() => Promise.reject());
	}).run().then(passed => {
		t.is(passed, true);
		t.end();
	});
});

test('failing tests pass with `t.throws(nonThrowingPromise)`', t => {
	ava.failing(a => {
		return a.throws(Promise.resolve(10));
	}).run().then(passed => {
		t.is(passed, true);
		t.end();
	});
});

test('failing tests fail with `t.notThrows(throws)`', t => {
	let result;
	ava.failing(a => {
		return a.notThrows(Promise.resolve('foo'));
	}, null, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.message, failingTestHint);
		t.end();
	});
});

test('log from tests', t => {
	let result;

	ava(a => {
		a.log('a log message from a test');
		t.true(true);
		a.log('another log message from a test');
		a.log({b: 1, c: {d: 2}}, 'complex log', 5, 5.1);
		a.log();
	}, null, r => {
		result = r;
	}).run();

	t.deepEqual(
		result.result.logs,
		[
			'a log message from a test',
			'another log message from a test',
			'{\n  b: 1,\n  c: {\n    d: 2,\n  },\n} complex log 5 5.1'
		]
	);

	t.end();
});
