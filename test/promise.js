'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({color: false});

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
