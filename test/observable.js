'use strict';
const test = require('tap').test;
const Test = require('../lib/test'); // eslint-disable-line import/order
const Observable = require('zen-observable');
const xs = require('xstream').Stream;
const Rx = require('rxjs');
const most = require('most');

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

test('returning an observable from a legacy async fn is an error', t => {
	let result;
	const passed = ava.cb(a => {
		a.plan(2);

		const observable = Observable.of();

		setImmediate(() => {
			a.pass();
			a.pass();
			a.end();
		});

		return observable;
	}, r => {
		result = r;
	}).run();

	t.is(passed, false);
	t.match(result.reason.message, /Do not return observables/);
	t.end();
});

test('handle throws with thrown observable', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.throws(observable);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with long running thrown observable', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			setTimeout(() => {
				observer.error(new Error('abc'));
			}, 2000);
		});

		return a.throws(observable, /abc/);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with completed observable', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = Observable.of();
		return a.throws(observable);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

/* these two tests work */
detects('zen-observable', x => Observable.of(x));
detects('RxJS', x => Rx.Observable.of(x));

/* these two tests are broken */
detects('xstream', x => xs.of(x));
detects('most', x => most.of(x));

/**
 * @DEBUG
 * Demonstrate that we use proper constructors in detects().
 * see the messages when running the test file:
 * $ node_modules/.bin/tap --no-cov test/observable.js
 */
/*
const log = (...args) => console.log(...args);
const logger = {next: log};

xs.of('xstream').subscribe(logger);
most.of('most').subscribe(logger);
Rx.Observable.of('rxjs').subscribe(logger);
Observable.of('zen-observable').subscribe(logger);
/* -/- */

/**
 * @param name {string} library name
 * @param ctor {(x) => Observable}
 */
function detects(name, ctor) {
	test(`detects ${name} observables`, t => {
		ava(a => {
			a.plan(1);

			const observable = ctor(1);
			observable.subscribe(x => a.is(x, 1));
			return observable;
		}).run().then(result => {
			t.is(result.passed, true);
			t.is(result.result.assertCount, 1);
			t.end();
		});
	});
}

test('handle throws with regex', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, /abc/);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with string', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error('abc'));
		});

		return a.throws(observable, 'abc');
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle throws with false-positive observable', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.next(new Error());
			observer.complete();
		});

		return a.throws(observable);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});

test('handle notThrows with completed observable', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = Observable.of();
		return a.notThrows(observable);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, true);
		t.is(result.result.assertCount, 1);
		t.end();
	});
});

test('handle notThrows with thrown observable', t => {
	let result;
	ava(a => {
		a.plan(1);

		const observable = new Observable(observer => {
			observer.error(new Error());
		});

		return a.notThrows(observable);
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.is(result.reason.name, 'AssertionError');
		t.end();
	});
});
