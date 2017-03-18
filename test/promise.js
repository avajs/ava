'use strict';
const Promise = require('bluebird');
const test = require('tap').test;
const formatValue = require('../lib/format-assert-error').formatValue;
const Test = require('../lib/test');

function ava(fn) {
	const a = new Test(fn);
	a.metadata = {callback: false};
	return a;
}

ava.cb = function (fn) {
	const a = new Test(fn);
	a.metadata = {callback: true};
	return a;
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
	ava.cb(a => {
		a.plan(1);

		return Promise.resolve(true).then(() => {
			a.pass();
			a.end();
		});
	}).run().then(result => {
		t.is(result.passed, false);
		t.match(result.reason.message, /Do not return promises/);
		t.end();
	});
});

test('assertion plan is tested after returned promise resolves', t => {
	const start = Date.now();
	ava(a => {
		a.plan(2);

		const defer = Promise.defer();

		setTimeout(() => {
			defer.resolve();
		}, 500);

		a.pass();
		a.pass();

		return defer.promise;
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.planCount, 2);
		t.is(result.result.assertCount, 2);
		t.true(Date.now() - start >= 500);
		t.end();
	});
});

test('missing assertion will fail the test', t => {
	ava(a => {
		a.plan(2);

		const defer = Promise.defer();

		setTimeout(() => {
			a.pass();
			defer.resolve();
		}, 200);

		return defer.promise;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.assertion, 'plan');
		t.end();
	});
});

test('extra assertion will fail the test', t => {
	ava(a => {
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
		t.is(result.reason.assertion, 'plan');
		t.end();
	});
});

test('handle throws with rejected promise', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.throws(promise);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

// TODO(team): This is a very slow test, and I can't figure out why we need it - James
test('handle throws with long running rejected promise', t => {
	ava(a => {
		a.plan(1);

		const promise = new Promise((resolve, reject) => {
			setTimeout(() => {
				reject(new Error('abc'));
			}, 2000);
		});

		return a.throws(promise, /abc/);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with resolved promise', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.throws(promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /abc/);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('throws with regex will fail if error message does not match', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /def/);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with string', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'abc');
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('throws with string argument will reject if message does not match', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'def');
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('does not handle throws with string reject', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.reject('abc'); // eslint-disable-line prefer-promise-reject-errors
		return a.throws(promise, 'abc');
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with false-positive promise', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve(new Error());
		return a.throws(promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle notThrows with resolved promise', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.notThrows(promise);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle notThrows with rejected promise', t => {
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.notThrows(promise);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('assert pass', t => {
	ava(a => {
		return pass().then(() => {
			a.pass();
		});
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('assert fail', t => {
	ava(a => {
		return pass().then(() => {
			a.fail();
		});
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('reject', t => {
	ava(a => {
		return fail().then(() => {
			a.pass();
		});
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.is(result.reason.message, 'Rejected promise returned by test');
		t.same(result.reason.values, [{label: 'Rejection reason:', formatted: formatValue(new Error('unicorn'))}]);
		t.end();
	});
});

test('reject with non-Error', t => {
	// eslint-disable-next-line prefer-promise-reject-errors
	ava(() => Promise.reject('failure')).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.is(result.reason.message, 'Rejected promise returned by test');
		t.same(result.reason.values, [{label: 'Rejection reason:', formatted: formatValue('failure')}]);
		t.end();
	});
});
