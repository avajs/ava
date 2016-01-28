'use strict';
var test = require('tap').test;
var Test = require('../lib/test');
var Observable = require('./fixture/observable');

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

test('returning an observable from a legacy async fn is an error', function (t) {
	ava.cb(function (a) {
		a.plan(2);

		var observable = Observable.of();

		setTimeout(function () {
			a.pass();
			a.pass();
			a.end();
		}, 200);

		return observable;
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.match(result.reason.message, /Do not return observables/);
		t.end();
	});
});

test('handle throws with thrown observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error());
		});

		return a.throws(observable);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with long running thrown observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			setTimeout(function () {
				observer.error(new Error('abc'));
			}, 2000);
		});

		return a.throws(observable, /abc/);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with completed observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = Observable.of();
		return a.throws(observable);
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, /abc/);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with string', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, 'abc');
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with false-positive observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.next(new Error());
			observer.complete();
		});

		return a.throws(observable);
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle doesNotThrow with completed observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = Observable.of();
		return a.doesNotThrow(observable);
	}).run().then(function (result) {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle doesNotThrow with thrown observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error());
		});

		return a.doesNotThrow(observable);
	}).run().then(function (result) {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});
