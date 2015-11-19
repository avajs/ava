'use strict';
var test = require('tap').test;
var ava = require('../lib/test');
var Observable = require('./fixture/observable');

test('plan assertions', function (t) {
	ava(function (a) {
		a.plan(2);

		var observable = Observable.of();

		setTimeout(function () {
			a.pass();
			a.pass();
		}, 200);

		return observable;
	}).run().then(function (a) {
		t.is(a.planCount, 2);
		t.is(a.assertCount, 2);
		t.end();
	});
});

test('handle throws with thrown observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error());
		});

		a.throws(observable);
	}).run().then(function (a) {
		t.notOk(a.assertError);
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

		a.throws(observable, /abc/);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle throws with completed observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = Observable.of();
		a.throws(observable);
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error('abc'));
		});

		a.throws(observable, /abc/);
	}).run().then(function (a) {
		t.notOk(a.assertionError);
		t.end();
	});
});

test('handle throws with string', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error('abc'));
		});

		a.throws(observable, 'abc');
	}).run().then(function (a) {
		t.notOk(a.assertionError);
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

		a.throws(observable);
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle doesNotThrow with completed observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = Observable.of();
		a.doesNotThrow(observable);
	}).run().then(function (a) {
		t.notOk(a.assertError);
		t.end();
	});
});

test('handle doesNotThrow with thrown observable', function (t) {
	ava(function (a) {
		a.plan(1);

		var observable = new Observable(function (observer) {
			observer.error(new Error());
		});

		a.doesNotThrow(observable);
	}).run().catch(function (err) {
		t.ok(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});
