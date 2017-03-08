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

type Context<T> = { context: T };
type AnyContext = Context<any>;

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
	notThrows<U>(value: PromiseLike<U>, message?: string): Promise<U>;
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

export type GenericTestContext<T> = TestContext & T;
export type GenericCallbackTestContext<T> = CallbackTestContext & T;

export interface Macro<T> {
	(t: T, ...args: any[]): void;
	title? (providedTitle: string, ...args: any[]): string;
}
export type Macros<T> = Macro<T> | Macro<T>[];

export interface DefineTest<T> {
    (name: string, run: GenericTest<T>): void;
    (run: GenericTest<T>): void;
    (name: string, run: Macros<GenericTestContext<T>>, ...args: any[]): void;
    (run: Macros<GenericTestContext<T>>, ...args: any[]): void;
}

export type DefineContextualTest<T> = DefineTest<Context<T>>;
