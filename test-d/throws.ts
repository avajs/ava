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
	expectType<Error | undefined>(t.throws(() => {}));
	const error2: CustomError | undefined = t.throws(() => {});
	expectType<CustomError | undefined>(error2);
	expectType<CustomError | undefined>(t.throws<CustomError>(() => {}));
});

test('throwsAsync', async t => {
	expectType<Error | undefined>(await t.throwsAsync(async () => {}));
	expectType<CustomError | undefined>(await t.throwsAsync<CustomError>(async () => {}));
	expectType<Error | undefined>(await t.throwsAsync(Promise.reject()));
	expectType<CustomError | undefined>(await t.throwsAsync<CustomError>(Promise.reject()));
});
