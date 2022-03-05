/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function */
import test from 'ava';

test('return a promise-like', t => ({
	then(resolve) {
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
	then() {},
}));
