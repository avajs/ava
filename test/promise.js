'use strict';
var Promise = require('bluebird');
var test = require('tap').test;
var _ava = require('../lib/test');

function ava(fn) {
	var a = _ava(fn);
	a.metadata = {callback: false};
	return a;
}

ava.cb = function (fn) {
	var a = _ava(fn);
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
	}).run().catch(function (err) {
		t.match(err.message, /Do not return promises/);
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
	}).run().then(function (a) {
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
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
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.expected, 2);
		t.is(err.actual, 1);
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
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.expected, 2);
		t.is(err.actual, 3);
		t.end();
	});
});

test('handle throws with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		return a.throws(promise);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle throws with long running rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = new Promise(function (resolve, reject) {
			setTimeout(function () {
				reject(new Error('abc'));
			}, 2000);
		});

		return a.throws(promise, /abc/);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle throws with resolved promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve();
		return a.throws(promise);
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		return a.throws(promise, /abc/);
	}).run().then(function (a) {
		t.notOk(a.assertionError);
		t.end();
	});
});

test('handle throws with string', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		return a.throws(promise, 'abc');
	}).run().then(function (a) {
		t.notOk(a.assertionError);
		t.end();
	});
});

test('handle throws with false-positive promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve(new Error());
		return a.throws(promise);
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle doesNotThrow with resolved promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve();
		return a.doesNotThrow(promise);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle doesNotThrow with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		return a.doesNotThrow(promise);
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('assert pass', function (t) {
	ava(function (a) {
		return pass().then(function () {
			a.pass();
		});
	}).run().then(function (a) {
		t.is(a.assertCount, 1);
		t.end();
	});
});

test('assert fail', function (t) {
	ava(function (a) {
		return pass().then(function () {
			a.fail();
		});
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('reject', function (t) {
	ava(function (a) {
		return fail().then(function () {
			a.pass();
		});
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});
