/* eslint-disable @typescript-eslint/no-empty-function */
import {expectError, expectType} from 'tsd';

import test from '../../entrypoints/main.mjs';

class CustomError extends Error {
	foo: string;

	constructor() {
		super();
		this.foo = 'foo';
	}
}

test('throws', t => {
	const error1 = t.throws(() => {});
	expectType<Error | undefined>(error1);
	const error2: CustomError | undefined = t.throws(() => {});
	expectType<CustomError | undefined>(error2);
	expectType<CustomError | undefined>(t.throws<CustomError>(() => {}));
	const error3 = t.throws(() => {}, {instanceOf: CustomError});
	expectType<CustomError | undefined>(error3);
	const error4 = t.throws(() => {}, {is: new CustomError()});
	expectType<CustomError | undefined>(error4);
	const error5 = t.throws(() => {}, {instanceOf: CustomError, is: new CustomError()});
	expectType<CustomError | undefined>(error5);
	const error6 = t.throws(() => {
		throw 'foo'; // eslint-disable-line @typescript-eslint/no-throw-literal
	}, {any: true});
	expectType<unknown>(error6);
	expectError(t.throws(() => {
		throw 'foo'; // eslint-disable-line @typescript-eslint/no-throw-literal
		// @ts-expect-error TS2769
	}, {instanceOf: String, is: 'foo'}));
});

test('throwsAsync', async t => {
	const error1 = await t.throwsAsync(async () => {});
	expectType<Error | undefined>(error1);
	expectType<CustomError | undefined>(await t.throwsAsync<CustomError>(async () => {}));
	const error2 = await t.throwsAsync(Promise.reject());
	expectType<Error | undefined>(error2);
	expectType<CustomError | undefined>(await t.throwsAsync<CustomError>(Promise.reject()));
	const error3 = await t.throwsAsync(async () => {}, {instanceOf: CustomError});
	expectType<CustomError | undefined>(error3);
	const error4 = await t.throwsAsync(async () => {}, {is: new CustomError()});
	expectType<CustomError | undefined>(error4);
	const error5 = await t.throwsAsync(async () => {}, {instanceOf: CustomError, is: new CustomError()});
	expectType<CustomError | undefined>(error5);
	const error6 = await t.throwsAsync(async () => {
		throw 'foo'; // eslint-disable-line @typescript-eslint/no-throw-literal
	}, {any: true});
	expectType<unknown>(error6);
	// @ts-expect-error TS2769
	expectError(t.throwsAsync(async () => {
		throw 'foo'; // eslint-disable-line @typescript-eslint/no-throw-literal
	}, {instanceOf: String, is: 'foo'}));
});
