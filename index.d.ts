export interface Observable {
	subscribe(observer: (value: {}) => void): void;
}

export type Test = (t: TestContext) => Promise<void> | Iterator<any> | Observable | void;
export type ContextualTest = (t: ContextualTestContext) => Promise<void> | Iterator<any> | Observable | void;
export type SerialTest = (t: TestContext) => void;
export type ContextualSerialTest = (t: ContextualTestContext) => void;
export type CallbackTest = (t: CallbackTestContext) => void;
export type ContextualCallbackTest = (t: ContextualCallbackTestContext) => void;

export interface Runner {
	(name: string, run: Test): void;
	(run: Test): void;
	skip: Runner;
	cb: CallbackRunner;
}
export interface ContextualRunner {
	(name: string, run: ContextualTest): void;
	(run: ContextualTest): void;
	skip: ContextualRunner;
	cb: ContextualCallbackRunner;
}
export interface SerialRunner {
	(name: string, run: SerialTest): void;
	(run: SerialTest): void;
	skip: SerialRunner;
}
export interface ContextualSerialRunner {
	(name: string, run: ContextualSerialTest): void;
	(run: ContextualSerialTest): void;
	skip: ContextualSerialRunner;
}
export interface CallbackRunner {
	(name: string, run: CallbackTest): void;
	(run: CallbackTest): void;
	skip: CallbackRunner;
}
export interface ContextualCallbackRunner {
	(name: string, run: ContextualCallbackTest): void;
	(run: ContextualCallbackTest): void;
	skip: ContextualCallbackRunner;
}

export function test(name: string, run: ContextualTest): void;
export function test(run: ContextualTest): void;
export namespace test {
	export const before: Runner;
	export const after: Runner;
	export const beforeEach: ContextualRunner;
	export const afterEach: ContextualRunner;

	export const skip: typeof test;
	export const only: typeof test;

	export function serial(name: string, run: ContextualSerialTest): void;
	export function serial(run: ContextualSerialTest): void;
	export function failing(name: string, run: ContextualCallbackTest): void;
	export function failing(run: ContextualCallbackTest): void;
	export function cb(name: string, run: ContextualCallbackTest): void;
	export function cb(run: ContextualCallbackTest): void;
	export function todo(name: string): void;
}
export namespace test.serial {
	export const before: SerialRunner;
	export const after: SerialRunner;
	export const beforeEach: ContextualSerialRunner;
	export const afterEach: ContextualSerialRunner;

	export const skip: typeof test.serial;
	export const only: typeof test.serial;

	export function cb(name: string, run: ContextualCallbackTest): void;
	export function cb(run: ContextualCallbackTest): void;
}
export namespace test.failing {
	export const before: CallbackRunner;
	export const after: CallbackRunner;
	export const beforeEach: ContextualCallbackRunner;
	export const afterEach: ContextualCallbackRunner;

	export const skip: typeof test.cb;
	export const only: typeof test.cb;

	export function cb(name: string, run: ContextualCallbackTest): void;
	export function cb(run: ContextualCallbackTest): void;
}
export namespace test.cb {
	export const before: CallbackRunner;
	export const after: CallbackRunner;
	export const beforeEach: ContextualCallbackRunner;
	export const afterEach: ContextualCallbackRunner;

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
	truthy(value: any, message?: string): void;
	/**
	 * Assert that value is falsy.
	 */
	falsy(value: any, message?: string): void;
	/**
	 * DEPRECATED, use `truthy`. Assert that value is truthy.
	 */
	ok(value: any, message?: string): void;
	/**
	 * DEPRECATED, use `falsy`. Assert that value is falsy.
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
	deepEqual<U>(value: U, expected: U, message?: string): void;
	/**
	 * Assert that value is not deep equal to expected.
	 */
	notDeepEqual<U>(value: U, expected: U, message?: string): void;
	/**
	 * Assert that function throws an error or promise rejects.
	 * @param error Can be a constructor, regex, error message or validation function.
	 */
	 /**
 	 * DEPRECATED, use `deepEqual`. Assert that value is deep equal to expected.
 	 */
 	same<U>(value: U, expected: U, message?: string): void;
 	/**
 	 * DEPRECATED use `notDeepEqual`. Assert that value is not deep equal to expected.
 	 */
 	notSame<U>(value: U, expected: U, message?: string): void;
 	/**
 	 * Assert that function throws an error or promise rejects.
 	 * @param error Can be a constructor, regex, error message or validation function.
 	 */
	throws(value: Promise<{}>, error?: ErrorValidator, message?: string): Promise<any>;
	throws(value: () => void, error?: ErrorValidator, message?: string): any;
	/**
	 * Assert that function doesn't throw an error or promise resolves.
	 */
	notThrows<U>(value: Promise<U>, message?: string): Promise<U>;
	notThrows(value: () => void, message?: string): void;
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
export interface ContextualTestContext extends TestContext {
	context: any;
}
export interface ContextualCallbackTestContext extends CallbackTestContext {
	context: any;
}
