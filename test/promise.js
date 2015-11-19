'use strict';
var Promise = require('bluebird');
var test = require('tap').test;
var ava = require('../lib/test');

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

test('plan assertions', function (t) {
	ava(function (a) {
		a.plan(2);

		var promise = Promise.resolve();

		setTimeout(function () {
			a.pass();
			a.pass();
		}, 200);

		return promise;
	}).run().then(function (a) {
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
		t.end();
	});
});

test('handle throws with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		a.throws(promise);
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

		a.throws(promise, /abc/);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle throws with resolved promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve();
		a.throws(promise);
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
		a.throws(promise, /abc/);
	}).run().then(function (a) {
		t.notOk(a.assertionError);
		t.end();
	});
});

test('handle throws with string', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error('abc'));
		a.throws(promise, 'abc');
	}).run().then(function (a) {
		t.notOk(a.assertionError);
		t.end();
	});
});

test('handle throws with false-positive promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.resolve(new Error());
		a.throws(promise);
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
		a.doesNotThrow(promise);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle doesNotThrow with rejected promise', function (t) {
	ava(function (a) {
		a.plan(1);

		var promise = Promise.reject(new Error());
		a.doesNotThrow(promise);
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
