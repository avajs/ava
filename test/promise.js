'use strict';
var Promise = require('bluebird');
var test = require('tap').test;
var Test = require('../lib/test');

function ava(fn) {
	var a = new Test(fn);
	a.metadata = {callback: false};
	return a;
}

ava.cb = function (fn) {
	var a = new Test(fn);
	a.metadata = {callback: true};
	return a;
};

function pass() {
	return new Promise(function (resolve) {
		setImmediate(resolve);
	});
}

function fail() {
	return new Promise(function (resolve, reject) {
		setImmediate(function () {
			reject(new Error('unicorn'));
		});
	});
}

test('returning a promise from a legacy async fn is an error', function (t) {
	ava.cb(function (a) {
		a.plan(1);

		return Promise.resolve(true).then(function () {
			a.pass();
			a.end();
		});
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.match(result.reason.message, /Do not return promises/);
		t.end();
	});
});

test('assertion plan is tested after returned promise resolves', function (t) {
	var start = Date.now();
	ava(function (a) {
		a.plan(2);

		var defer = Promise.defer();

		setTimeout(function () {
			defer.resolve();
		}, 500);

		a.pass();
		a.pass();

		return defer.promise;
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.planCount, 2);
		t.is(result.result.assertCount, 2);
		t.true(Date.now() - start >= 500);
		t.end();
	});
});

test('missing assertion will fail the test', function (t) {
	ava(function (a) {
		a.plan(2);

		var defer = Promise.defer();

		setTimeout(function () {
			a.pass();
			defer.resolve();
		}, 200);

		return defer.promise;
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.expected, 2);
		t.is(result.reason.actual, 1);
		t.end();
	});
});

test('extra assertion will fail the test', function (t) {
	ava(function (a) {
		a.plan(2);

		var defer = Promise.defer();

		setTimeout(function () {
			a.pass();
			a.pass();
		}, 200);

		setTimeout(function () {
			a.pass();
			defer.resolve();
		}, 500);

		return defer.promise;
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.expected, 2);
		t.is(result.reason.actual, 3);
		t.end();
	});
});

test('handle throws with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		return a.throws(promise);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

// TODO(team): This is a very slow test, and I can't figure out why we need it - James
test('handle throws with long running rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = new Promise(function (resolve, reject) {
			setTimeout(function () {
				reject(new Error('abc'));
			}, 2000);
		});

		return a.throws(promise, /abc/);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with resolved promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve();
		return a.throws(promise);
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /abc/);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('throws with regex will fail if error message does not match', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /def/);
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with string', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'abc');
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('throws with string argument will reject if message does not match', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'def');
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex with string reject', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject('abc');
		return a.throws(promise, /abc/);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with string with string reject', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject('abc');
		return a.throws(promise, 'abc');
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with false-positive promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve(new Error());
		return a.throws(promise);
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle notThrows with resolved promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve();
		return a.notThrows(promise);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle notThrows with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		return a.notThrows(promise);
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('assert pass', function (t) {
	ava(function (a) {
		return pass().then(function () {
			a.pass();
		});
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('assert fail', function (t) {
	ava(function (a) {
		return pass().then(function () {
			a.fail();
		});
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('reject', function (t) {
	ava(function (a) {
		return fail().then(function () {
			a.pass();
		});
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'Error');
		t.is(result.reason.message, 'unicorn');
		t.end();
	});
});

test('reject with non-Error', function (t) {
	ava(function () {
		return Promise.reject('failure');
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.is(result.reason.message, 'Promise rejected with "failure"');
		t.end();
	});
});
