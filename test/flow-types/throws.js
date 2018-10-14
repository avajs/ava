// @flow
import test from '../../index.js.flow';

class CustomError extends Error {
	foo: string;

	constructor() {
		super();
		this.foo = 'foo';
	}
}

test('throws', t => {
	const err1: Error = t.throws(() => {});
	// t.is(err1.foo, 'foo');
	const err2: CustomError = t.throws(() => {});
	t.is(err2.foo, 'foo');
	const err3 = t.throws<CustomError>(() => {});
	t.is(err3.foo, 'foo');
});

test('throwsAsync', async t => {
	const err1: Error = await t.throwsAsync(Promise.reject());
	// t.is(err1.foo, 'foo');
	const err2 = await t.throwsAsync<CustomError>(Promise.reject());
	t.is(err2.foo, 'foo');
});
