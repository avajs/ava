export type ErrorValidator
	= (new (...args: any[]) => any)
	| RegExp
	| string
	| ((error: any) => boolean);

export interface Observable {
	subscribe(observer: (value: {}) => void): void;
}
export type Test = (t: TestContext) => PromiseLike<void> | Iterator<any> | Observable | void;
export type GenericTest<T> = (t: GenericTestContext<T>) => PromiseLike<void> | Iterator<any> | Observable | void;
export type CallbackTest = (t: CallbackTestContext) => void;
export type GenericCallbackTest<T> = (t: GenericCallbackTestContext<T>) => void;

export interface Context<T> { context: T }
export type AnyContext = Context<any>;

export type ContextualTest = GenericTest<AnyContext>;
export type ContextualCallbackTest = GenericCallbackTest<AnyContext>;

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
	 * Assert that value is true.
	 */
	true(value: any, message?: string): void;
	/**
	 * Assert that value is false.
	 */
	false(value: any, message?: string): void;
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
	throws(value: PromiseLike<any>, error?: ErrorValidator, message?: string): Promise<any>;
	throws(value: () => void, error?: ErrorValidator, message?: string): any;
	/**
	 * Assert that function doesn't throw an error or promise resolves.
	 */
	notThrows(value: PromiseLike<any>, message?: string): Promise<void>;
	notThrows(value: () => void, message?: string): void;
	/**
	 * Assert that contents matches regex.
	 */
	regex(contents: string, regex: RegExp, message?: string): void;
	/**
	 * Assert that contents matches a snapshot.
	 */
	snapshot(contents: any, message?: string): void;
	/**
	 * Assert that contents does not match regex.
	 */
	notRegex(contents: string, regex: RegExp, message?: string): void;
	/**
	 * Assert that error is falsy.
	 */
	ifError(error: any, message?: string): void;
}
export interface TestContext extends AssertContext {
	/**
	 * Test title.
	 */
	title: string;
	/**
	 * Plan how many assertion there are in the test.
	 * The test will fail if the actual assertion count doesn't match planned assertions.
	 */
	plan(count: number): void;

	skip: AssertContext;
	/**
	 * Print a log message contextually alongside the test result instead of immediately printing it to stdout like console.log.
	 */
	log(message: string): void;
}
export interface CallbackTestContext extends TestContext {
	/**
	 * End the test.
	 */
	end(): void;
}

export type GenericTestContext<T> = TestContext & T;
export type GenericCallbackTestContext<T> = CallbackTestContext & T;

export interface Macro<T> {
	(t: T, ...args: any[]): void;
	title? (providedTitle: string, ...args: any[]): string;
}
export type Macros<T> = Macro<T> | Macro<T>[];

interface RegisterBase<T> {
    (name: string, run: GenericTest<T>): void;
    (run: GenericTest<T>): void;
    (name: string, run: Macros<GenericTestContext<T>>, ...args: any[]): void;
    (run: Macros<GenericTestContext<T>>, ...args: any[]): void;
}

interface CallbackRegisterBase<T> {
    (name: string, run: GenericCallbackTest<T>): void;
    (run: GenericCallbackTest<T>): void;
    (name: string, run: Macros<GenericCallbackTestContext<T>>, ...args: any[]): void;
    (run: Macros<GenericCallbackTestContext<T>>, ...args: any[]): void;
}

export default test;
export const test: RegisterContextual<any>;
export interface RegisterContextual<T> extends Register<Context<T>> {
}
