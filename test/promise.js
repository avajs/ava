'use strict';
require('../lib/worker-options').set({color: false});

const Promise = require('bluebird');
const test = require('tap').test;
const Test = require('../lib/test');

function ava(fn) {
	return new Test({
		contextRef: null,
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: false},
		title: '[anonymous]'
	});
}

ava.cb = function (fn) {
	return new Test({
		contextRef: null,
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: true},
		title: '[anonymous]'
	});
};

function pass() {
	return new Promise(resolve => {
		setImmediate(resolve);
	});
}

function fail() {
	return new Promise((resolve, reject) => {
		setImmediate(() => {
			reject(new Error('unicorn'));
		});
	});
}

test('returning a promise from a legacy async fn is an error', t => {
	return ava.cb(a => {
		a.plan(1);

		return Promise.resolve(true).then(() => {
			a.pass();
			a.end();
		});
	}).run().then(result => {
		t.is(result.passed, false);
		t.match(result.error.message, /Do not return promises/);
	});
});

test('assertion plan is tested after returned promise resolves', t => {
	const start = Date.now();
	const instance = ava(a => {
		a.plan(2);

		const defer = Promise.defer();

		setTimeout(() => {
			defer.resolve();
		}, 500);

		a.pass();
		a.pass();

		return defer.promise;
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, 2);
		t.is(instance.assertCount, 2);
		t.true(Date.now() - start >= 500);
	});
});

test('missing assertion will fail the test', t => {
	return ava(a => {
		a.plan(2);

		const defer = Promise.defer();

		setTimeout(() => {
			a.pass();
			defer.resolve();
		}, 200);

		return defer.promise;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.assertion, 'plan');
	});
});

test('extra assertion will fail the test', t => {
	return ava(a => {
		a.plan(2);

		const defer = Promise.defer();

		setTimeout(() => {
			a.pass();
			a.pass();
		}, 200);

		setTimeout(() => {
			a.pass();
			defer.resolve();
		}, 500);

		return defer.promise;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.assertion, 'plan');
	});
});

test('handle throws with rejected promise', t => {
	const instance = ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.throws(promise);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle throws with rejected promise returned by function', t => {
	const instance = ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.throws(() => promise);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

// TODO(team): This is a very slow test, and I can't figure out why we need it - James
test('handle throws with long running rejected promise', t => {
	const instance = ava(a => {
		a.plan(1);

		const promise = new Promise((resolve, reject) => {
			setTimeout(() => {
				reject(new Error('abc'));
			}, 2000);
		});

		return a.throws(promise, /abc/);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle throws with resolved promise', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.throws(promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle throws with resolved promise returned by function', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.throws(() => promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle throws with regex', t => {
	const instance = ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /abc/);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('throws with regex will fail if error message does not match', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /def/);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle throws with string', t => {
	const instance = ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'abc');
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('throws with string argument will reject if message does not match', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'def');
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('does not handle throws with string reject', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.reject('abc'); // eslint-disable-line prefer-promise-reject-errors
		return a.throws(promise, 'abc');
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle throws with false-positive promise', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.resolve(new Error());
		return a.throws(promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle notThrows with resolved promise', t => {
	const instance = ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.notThrows(promise);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle notThrows with rejected promise', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.notThrows(promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle notThrows with resolved promise returned by function', t => {
	const instance = ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.notThrows(() => promise);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle notThrows with rejected promise returned by function', t => {
	return ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.notThrows(() => promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('assert pass', t => {
	const instance = ava(a => {
		return pass().then(() => {
			a.pass();
		});
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('assert fail', t => {
	return ava(a => {
		return pass().then(() => {
			a.fail();
		});
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('reject', t => {
	return ava(a => {
		return fail().then(() => {
			a.pass();
		});
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.message, 'Rejected promise returned by test');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Rejected promise returned by test. Reason:');
		t.match(result.error.values[0].formatted, /.*Error.*\n.*message: 'unicorn'/);
	});
});

test('reject with non-Error', t => {
	return ava(() => {
		return Promise.reject('failure'); // eslint-disable-line prefer-promise-reject-errors
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.message, 'Rejected promise returned by test');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Rejected promise returned by test. Reason:');
		t.match(result.error.values[0].formatted, /failure/);
	});
});
