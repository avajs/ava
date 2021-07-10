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
	expectType<Error | null>(t.throws(() => {}));
	const error2: CustomError | null = t.throws(() => {});
	expectType<CustomError | null>(error2);
	expectType<CustomError | null>(t.throws<CustomError>(() => {}));
});

test('throwsAsync', async t => {
	expectType<Error | null>(await t.throwsAsync(async () => {}));
	expectType<CustomError | null>(await t.throwsAsync<CustomError>(async () => {}));
	expectType<Error | null>(await t.throwsAsync(Promise.reject()));
	expectType<CustomError | null>(await t.throwsAsync<CustomError>(Promise.reject()));
});
