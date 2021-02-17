import {expectType} from 'tsd';
import test from '..';

class CustomError extends Error {
	foo: string;

	constructor() {
		super();
		this.foo = 'foo';
	}
}

test('throws', t => {
	expectType<Error>(t.throws(() => {}));
	const error2: CustomError = t.throws(() => {});
	expectType<CustomError>(error2);
	expectType<CustomError>(t.throws<CustomError>(() => {}));
});

test('throwsAsync', async t => {
	expectType<Error>(await t.throwsAsync(Promise.reject()));
	expectType<CustomError>(await t.throwsAsync<CustomError>(Promise.reject()));
});
