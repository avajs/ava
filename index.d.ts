export interface Observable {
	subscribe(observer: (value: {}) => void): void;
}

export type Test = (t: TestContext) => Promise<void> | Iterator<any> | Observable | void;
export type SerialTest = (t: TestContext) => void;
export type CallbackTest = (t: CallbackTestContext) => void;

export interface Runner {
	(name: string, run: Test): void;
	(run: Test): void;
	skip: Runner;
	cb: CallbackRunner;
}
export interface SerialRunner {
	(name: string, run: SerialTest): void;
	(run: SerialTest): void;
	skip: SerialRunner;
}
export interface CallbackRunner {
	(name: string, run: CallbackTest): void;
	(run: CallbackTest): void;
	skip: CallbackRunner;
}

export function test(name: string, run: Test): void;
export function test(run: Test): void;
export namespace test {
	export const before: Runner;
	export const after: Runner;
	export const beforeEach: Runner;
	export const afterEach: Runner;

	export const skip: typeof test;
	export const only: typeof test;

	export function serial(name: string, run: SerialTest): void;
	export function serial(run: SerialTest): void;
	export function cb(name: string, run: CallbackTest): void;
	export function cb(run: CallbackTest): void;
}
export namespace test.serial {
	export const before: SerialRunner;
	export const after: SerialRunner;
	export const beforeEach: SerialRunner;
	export const afterEach: SerialRunner;

	export const skip: typeof test.serial;
	export const only: typeof test.serial;
}
export namespace test.cb {
	export const before: CallbackRunner;
	export const after: CallbackRunner;
	export const beforeEach: CallbackRunner;
	export const afterEach: CallbackRunner;

	export const skip: typeof test.cb;
	export const only: typeof test.cb;
}
export default test;

export type ErrorValidator
	= (new (...args: any[]) => any)
	| RegExp
	| string
	| ((error: any) => boolean);

export interface AssertContext {
	/**
	 * Passing assertion.
	 */
	pass(message?: string): void;
	/**
	 * Failing assertion.
	 */
	fail(message?: string): void;
	/**
	 * Assert that value is truthy.
	 */
	ok(value: any, message?: string): void;
	/**
	 * Assert that value is falsy.
	 */
	notOk(value: any, message?: string): void;
	/**
	 * Assert that value is true.
	 */
	true(value: boolean, message?: string): void;
	/**
	 * Assert that value is false.
	 */
	false(value: boolean, message?: string): void;
	/**
	 * Assert that value is equal to expected.
	 */
	is<U>(value: U, expected: U, message?: string): void;
	/**
	 * Assert that value is not equal to expected.
	 */
	not<U>(value: U, expected: U, message?: string): void;
	/**
	 * Assert that value is deep equal to expected.
	 */
	same<U>(value: U, expected: U, message?: string): void;
	/**
	 * Assert that value is not deep equal to expected.
	 */
	notSame<U>(value: U, expected: U, message?: string): void;
	/**
	 * Assert that function throws an error or promise rejects.
	 * @param error Can be a constructor, regex, error message or validation function.
	 */
	throws(value: (() => void) | Promise<{}>, error?: ErrorValidator, message?: string);
	/**
	 * Assert that function doesn't throw an error or promise resolves.
	 */
	notThrows(value: (() => void) | Promise<{}>, message?: string);
	/**
	 * Assert that contents matches regex.
	 */
	regex(contents: string, regex: RegExp, message?: string): void;
	/**
	 * Assert that error is falsy.
	 */
	ifError(error: any, message?: string): void;
}
export interface TestContext extends AssertContext {
	/**
	 * Plan how many assertion there are in the test.
	 * The test will fail if the actual assertion count doesn't match planned assertions.
	 */
	plan(count: number): void;

	skip: AssertContext;
}
export interface CallbackTestContext extends TestContext {
	/**
	 * End the test.
	 */
	end(): void;
}
