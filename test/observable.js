'use strict';
require('../lib/worker/options').set({});

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
