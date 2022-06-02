/* eslint-disable @typescript-eslint/no-empty-function */
import test from '..';

test('return a promise-like', t => ({
	then(resolve) { // eslint-disable-line unicorn/no-thenable
		resolve?.(); // eslint-disable-line @typescript-eslint/no-floating-promises
	},
}));

test('return a subscribable', t => ({
	subscribe({complete}) {
		complete();
	},
}));

test.after('return anything else', t => ({
	foo: 'bar',
	subscribe() {},
	then() {}, // eslint-disable-line unicorn/no-thenable
}));
