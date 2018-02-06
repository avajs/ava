'use strict';
require('../lib/worker-options').set({color: false});

const Promise = require('bluebird');
const test = require('tap').test;
const Test = require('../lib/test');

function ava(fn, onResult) {
	return new Test({
		contextRef: null,
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: false},
		onResult,
		title: '[anonymous]'
	});
}

ava.cb = function (fn, onResult) {
	return new Test({
		contextRef: null,
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: true},
		onResult,
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
	let result;
	const passed = ava.cb(a => {
		a.plan(1);

		return Promise.resolve(true).then(() => {
			a.pass();
			a.end();
		});
	}, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.match(result.reason.message, /Do not return promises/);
	t.end();
});

test('assertion plan is tested after returned promise resolves', t => {
	let result;
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
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.planCount, 2);
		t.is(result.result.assertCount, 2);
		t.true(Date.now() - start >= 500);
		t.end();
	});
});

test('missing assertion will fail the test', t => {
	let result;
	ava(a => {
		a.plan(2);

		const defer = Promise.defer();

		setTimeout(() => {
			a.pass();
			defer.resolve();
		}, 200);

		return defer.promise;
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.assertion, 'plan');
		t.end();
	});
});

test('extra assertion will fail the test', t => {
	let result;
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
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.assertion, 'plan');
		t.end();
	});
});

test('handle throws with rejected promise', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.throws(promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with rejected promise returned by function', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.throws(() => promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

// TODO(team): This is a very slow test, and I can't figure out why we need it - James
test('handle throws with long running rejected promise', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = new Promise((resolve, reject) => {
			setTimeout(() => {
				reject(new Error('abc'));
			}, 2000);
		});

		return a.throws(promise, /abc/);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with resolved promise', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.throws(promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with resolved promise returned by function', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.throws(() => promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /abc/);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('throws with regex will fail if error message does not match', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /def/);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with string', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'abc');
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('throws with string argument will reject if message does not match', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'def');
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('does not handle throws with string reject', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject('abc'); // eslint-disable-line prefer-promise-reject-errors
		return a.throws(promise, 'abc');
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with false-positive promise', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve(new Error());
		return a.throws(promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle notThrows with resolved promise', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.notThrows(promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle notThrows with rejected promise', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.notThrows(promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle notThrows with resolved promise returned by function', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.resolve();
		return a.notThrows(() => promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle notThrows with rejected promise returned by function', t => {
	let result;
	ava(a => {
		a.plan(1);

		const promise = Promise.reject(new Error());
		return a.notThrows(() => promise);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('assert pass', t => {
	let result;
	ava(a => {
		return pass().then(() => {
			a.pass();
		});
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('assert fail', t => {
	let result;
	ava(a => {
		return pass().then(() => {
			a.fail();
		});
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('reject', t => {
	let result;
	ava(a => {
		return fail().then(() => {
			a.pass();
		});
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.is(result.reason.message, 'Rejected promise returned by test');
		t.is(result.reason.values.length, 1);
		t.is(result.reason.values[0].label, 'Rejected promise returned by test. Reason:');
		t.match(result.reason.values[0].formatted, /.*Error.*\n.*message: 'unicorn'/);
		t.end();
	});
});

test('reject with non-Error', t => {
	let result;
	ava(
		() => Promise.reject('failure'), // eslint-disable-line prefer-promise-reject-errors
		r => {
			result = r;
		}
	).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.is(result.reason.message, 'Rejected promise returned by test');
		t.is(result.reason.values.length, 1);
		t.is(result.reason.values[0].label, 'Rejected promise returned by test. Reason:');
		t.match(result.reason.values[0].formatted, /failure/);
		t.end();
	});
});
