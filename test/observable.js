'use strict';
const test = require('tap').test;
const Test = require('../lib/test');
const Observable = require('./fixture/observable');

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

test('returning an observable from a legacy async fn is an error', t => {
	ava.cb(a => {
		a.plan(2);

		const observable = Observable.of();

		setTimeout(() => {
			a.pass();
			a.pass();
			a.end();
		}, 200);

		return observable;
	}).run().then(result => {
		t.is(result.passed, false);
		t.match(result.reason.message, /Do not return observables/);
		t.end();
	});
});

test('handle throws with thrown observable', t => {
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.throws(observable);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with long running thrown observable', t => {
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			setTimeout(() => {
				observer.error(new Error('abc'));
			}, 2000);
		});

		return a.throws(observable, /abc/);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with completed observable', t => {
	ava(a => {
		a.plan(1);

		const observable = Observable.of();
		return a.throws(observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle throws with regex', t => {
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, /abc/);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with string', t => {
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, 'abc');
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with false-positive observable', t => {
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.next(new Error());
			observer.complete();
		});

		return a.throws(observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle notThrows with completed observable', t => {
	ava(a => {
		a.plan(1);

		const observable = Observable.of();
		return a.notThrows(observable);
	}).run().then(result => {
		t.is(result.passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle notThrows with thrown observable', t => {
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.notThrows(observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});
