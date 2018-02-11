'use strict';
require('../lib/worker-options').set({});

const test = require('tap').test;
const Test = require('../lib/test');
const Observable = require('zen-observable'); // eslint-disable-line import/order

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

test('returning an observable from a legacy async fn is an error', t => {
	return ava.cb(a => {
		a.plan(2);

		const observable = Observable.of();

		setImmediate(() => {
			a.pass();
			a.pass();
			a.end();
		});

		return observable;
	}).run().then(result => {
		t.is(result.passed, false);
		t.match(result.error.message, /Do not return observables/);
	});
});

test('handle throws with erroring observable', t => {
	const instance = ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.throws(observable);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle throws with erroring observable returned by function', t => {
	const instance = ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.throws(() => observable);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle throws with long running erroring observable', t => {
	const instance = ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			setTimeout(() => {
				observer.error(new Error('abc'));
			}, 2000);
		});

		return a.throws(observable, /abc/);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle throws with completed observable', t => {
	return ava(a => {
		a.plan(1);

		const observable = Observable.of();
		return a.throws(observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle throws with completed observable returned by function', t => {
	return ava(a => {
		a.plan(1);

		const observable = Observable.of();
		return a.throws(() => observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle throws with regex', t => {
	const instance = ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, /abc/);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle throws with string', t => {
	const instance = ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, 'abc');
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle throws with false-positive observable', t => {
	return ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.next(new Error());
			observer.complete();
		});

		return a.throws(observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle notThrows with completed observable', t => {
	const instance = ava(a => {
		a.plan(1);

		const observable = Observable.of();
		return a.notThrows(observable);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle notThrows with thrown observable', t => {
	return ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.notThrows(observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('handle notThrows with erroring observable returned by function', t => {
	return ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.notThrows(() => observable);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});
