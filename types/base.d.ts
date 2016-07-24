export default test;

export type ErrorValidator
	= (new (...args: any[]) => any)
	| RegExp
	| string
	| ((error: any) => boolean);

export interface Observable {
	subscribe(observer: (value: {}) => void): void;
}

export type Test = (t: TestContext) => PromiseLike<void> | Iterator<any> | Observable | void;
export type ContextualTest = (t: ContextualTestContext) => PromiseLike<void> | Iterator<any> | Observable | void;
export type CallbackTest = (t: CallbackTestContext) => void;
export type ContextualCallbackTest = (t: ContextualCallbackTestContext) => void;

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
	 * DEPRECATED, use `deepEqual`. Assert that value is deep equal to expected.
	 * @param error Can be a constructor, regex, error message or validation function.
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
	throws(value: PromiseLike<any>, error?: ErrorValidator, message?: string): Promise<any>;
	throws(value: () => void, error?: ErrorValidator, message?: string): any;
	/**
	 * Assert that function doesn't throw an error or promise resolves.
	 */
	notThrows<U>(value: PromiseLike<U>, message?: string): Promise<U>;
	notThrows(value: () => void, message?: string): void;
	/**
	 * Assert that contents matches regex.
	 */
	regex(contents: string, regex: RegExp, message?: string): void;
	/**
	 * Assert that contents does not match regex.
	 */
	notRegex(contents, regex, message?: string): void;
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

export interface Macro<I, E, T> {
	(t: T, input: I, expected: E): void;
	title? (providedTitle: string, input: I, expected: E): string;
}
export type Macros<I, E, T> = Macro<I, E, T> | Macro<I, E, T>[];

export function test(name: string, run: ContextualTest): void;
export function test(run: ContextualTest): void;
export function test<I, E> (name: string, run: Macros<I, E, ContextualTestContext>, input: I, expected: E): void;
export function test<I, E> (run: Macros<I, E, ContextualTestContext>, input: I, expected: E): void;
