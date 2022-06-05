/* eslint-disable @typescript-eslint/no-empty-function */
import test from 'ava';

test.after('return anything else', _t => ({
	foo: 'bar',
	subscribe() {},
	then() {}, // eslint-disable-line unicorn/no-thenable
}));

test('return a promise-like', _t => ({
	then(resolve) { // eslint-disable-line unicorn/no-thenable
		resolve?.(); // eslint-disable-line @typescript-eslint/no-floating-promises
	},
}));

test('return a subscribable', _t => ({
	subscribe({complete}) {
		complete();
	},
}));
