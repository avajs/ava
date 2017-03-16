'use strict';
const test = require('tap').test;
const Test = require('../lib/test');
const Observable = require('zen-observable'); // eslint-disable-line import/order

function ava(fn, onResult) {
	const a = new Test(fn, null, null, onResult);
	a.metadata = {callback: false};
	return a;
}

ava.cb = function (fn, onResult) {
	const a = new Test(fn, null, null, onResult);
	a.metadata = {callback: true};
	return a;
};

test('returning an observable from a legacy async fn is an error', t => {
	let result;
	ava.cb(a => {
		a.plan(2);

		const observable = Observable.of();

		setTimeout(() => {
			a.pass();
			a.pass();
			a.end();
		}, 200);

		return observable;
	}, r => {
		result = r;
	}).run().then(passed => {
		t.is(passed, false);
		t.match(result.reason.message, /Do not return observables/);
		t.end();
	});
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
