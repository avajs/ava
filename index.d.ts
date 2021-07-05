export interface Subscribable {
	subscribe(observer: {
		error(error: any): void;
		complete(): void;
	}): void;
}

export type ErrorConstructor = new (...args: any[]) => Error;

/** Specify one or more expectations the thrown error must satisfy. */
export type ThrowsExpectation = {
	/** The thrown error must have a code that equals the given string or number. */
	code?: string | number;

	/** The thrown error must be an instance of this constructor. */
	instanceOf?: ErrorConstructor;

	/** The thrown error must be strictly equal to this value. */
	is?: Error;

	/** The thrown error must have a message that equals the given string, or matches the regular expression. */
	message?: string | RegExp;

	/** The thrown error must have a name that equals the given string. */
	name?: string;
};

export type CommitDiscardOptions = {
	/**
	 * Whether the logs should be included in those of the parent test.
	 */
	retainLogs?: boolean;
};

export interface Assertions {
	/**
	 * Assert that `actual` is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy), returning a boolean
	 * indicating whether the assertion passed. Comes with power-assert.
	 */
	assert: AssertAssertion;

	/**
	 * Assert that `actual` is [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to
	 * `expected`, returning a boolean indicating whether the assertion passed.
	 */
	deepEqual: DeepEqualAssertion;

	/**
	 * Assert that `value` is like `selector`, returning a boolean indicating whether the assertion passed.
	 */
	like: LikeAssertion;

	/** Fail the test, always returning `false`. */
	fail: FailAssertion;

	/**
	 * Assert that `actual` is strictly false, returning a boolean indicating whether the assertion passed.
	 */
	false: FalseAssertion;

	/**
	 * Assert that `actual` is [falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy), returning a boolean
	 * indicating whether the assertion passed.
	 */
	falsy: FalsyAssertion;

	/**
	 * Assert that `actual` is [the same
	 * value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) as `expected`,
	 * returning a boolean indicating whether the assertion passed.
	 */
	is: IsAssertion;

	/**
	 * Assert that `actual` is not [the same
	 * value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) as `expected`,
	 * returning a boolean indicating whether the assertion passed.
	 */
	not: NotAssertion;

	/**
	 * Assert that `actual` is not [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to
	 * `expected`, returning a boolean indicating whether the assertion passed.
	 */
	notDeepEqual: NotDeepEqualAssertion;

	/**
	 * Assert that `string` does not match the regular expression, returning a boolean indicating whether the assertion
	 * passed.
	 */
	notRegex: NotRegexAssertion;

	/** Assert that the function does not throw. */
	notThrows: NotThrowsAssertion;

	/** Assert that the async function does not throw, or that the promise does not reject. Must be awaited. */
	notThrowsAsync: NotThrowsAsyncAssertion;

	/** Count a passing assertion, always returning `true`. */
	pass: PassAssertion;

	/**
	 * Assert that `string` matches the regular expression, returning a boolean indicating whether the assertion passed.
	 */
	regex: RegexAssertion;

	/**
	 * Assert that `expected` is [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to a
	 * previously recorded [snapshot](https://github.com/concordancejs/concordance#serialization-details), or if
	 * necessary record a new snapshot.
	 */
	snapshot: SnapshotAssertion;

	/**
	 * Assert that the function throws [an error](https://www.npmjs.com/package/is-error). If so, returns the error value.
	 */
	throws: ThrowsAssertion;

	/**
	 * Assert that the async function throws [an error](https://www.npmjs.com/package/is-error), or the promise rejects
	 * with one. If so, returns a promise for the error value, which must be awaited.
	 */
	throwsAsync: ThrowsAsyncAssertion;

	/**
	 * Assert that `actual` is strictly true, returning a boolean indicating whether the assertion passed.
	 */
	true: TrueAssertion;

	/**
	 * Assert that `actual` is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy), returning a boolean
	 * indicating whether the assertion passed.
	 */
	truthy: TruthyAssertion;
}

export interface AssertAssertion {
	/**
	 * Assert that `actual` is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy), returning a boolean
	 * indicating whether the assertion passed. Comes with power-assert.
	 */
	(actual: any, message?: string): boolean;

	/** Skip this assertion. */
	skip(actual: any, message?: string): void;
}

export interface DeepEqualAssertion {
	/**
	 * Assert that `actual` is [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to
	 * `expected`, returning a boolean indicating whether the assertion passed.
	 */
	<Actual, Expected extends Actual>(actual: Actual, expected: Expected, message?: string): actual is Expected;

	/** Skip this assertion. */
	skip(actual: any, expected: any, message?: string): void;
}

export interface LikeAssertion {
	/**
	 * Assert that `value` is like `selector`, returning a boolean indicating whether the assertion passed.
	 */
	<Expected extends Record<string, any>>(value: any, selector: Expected, message?: string): value is Expected;

	/** Skip this assertion. */
	skip(value: any, selector: any, message?: string): void;
}

export interface FailAssertion {
	/** Fail the test, always returning `false`. */
	(message?: string): boolean;

	/** Skip this assertion. */
	skip(message?: string): void;
}

export interface FalseAssertion {
	/**
	 * Assert that `actual` is strictly false, returning a boolean indicating whether the assertion passed.
	 */
	(actual: any, message?: string): actual is false;

	/** Skip this assertion. */
	skip(actual: any, message?: string): void;
}

export interface FalsyAssertion {
	/**
	 * Assert that `actual` is [falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy), returning a boolean
	 * indicating whether the assertion passed.
	 */
	(actual: any, message?: string): boolean;

	/** Skip this assertion. */
	skip(actual: any, message?: string): void;
}

export interface IsAssertion {
	/**
	 * Assert that `actual` is [the same
	 * value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) as `expected`,
	 * returning a boolean indicating whether the assertion passed.
	 */
	<Actual, Expected extends Actual>(actual: Actual, expected: Expected, message?: string): actual is Expected;

	/** Skip this assertion. */
	skip(actual: any, expected: any, message?: string): void;
}

export interface NotAssertion {
	/**
	 * Assert that `actual` is not [the same
	 * value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) as `expected`,
	 * returning a boolean indicating whether the assertion passed.
	 */
	<Actual, Expected>(actual: Actual, expected: Expected, message?: string): boolean;

	/** Skip this assertion. */
	skip(actual: any, expected: any, message?: string): void;
}

export interface NotDeepEqualAssertion {
	/**
	 * Assert that `actual` is not [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to
	 * `expected`, returning a boolean indicating whether the assertion passed.
	 */
	<Actual, Expected>(actual: Actual, expected: Expected, message?: string): boolean;

	/** Skip this assertion. */
	skip(actual: any, expected: any, message?: string): void;
}

export interface NotRegexAssertion {
	/**
	 * Assert that `string` does not match the regular expression, returning a boolean indicating whether the assertion
	 * passed.
	 */
	(string: string, regex: RegExp, message?: string): boolean;

	/** Skip this assertion. */
	skip(string: string, regex: RegExp, message?: string): void;
}

export interface NotThrowsAssertion {
	/** Assert that the function does not throw. */
	(fn: () => any, message?: string): void;

	/** Skip this assertion. */
	skip(fn: () => any, message?: string): void;
}

export interface NotThrowsAsyncAssertion {
	/** Assert that the async function does not throw. You must await the result. */
	(fn: () => PromiseLike<any>, message?: string): Promise<void>;

	/** Assert that the promise does not reject. You must await the result. */
	(promise: PromiseLike<any>, message?: string): Promise<void>;

	/** Skip this assertion. */
	skip(nonThrower: any, message?: string): void;
}

export interface PassAssertion {
	/** Count a passing assertion, always returning `true`. */
	(message?: string): boolean;

	/** Skip this assertion. */
	skip(message?: string): void;
}

export interface RegexAssertion {
	/**
	 * Assert that `string` matches the regular expression, returning a boolean indicating whether the assertion passed.
	 */
	(string: string, regex: RegExp, message?: string): boolean;

	/** Skip this assertion. */
	skip(string: string, regex: RegExp, message?: string): void;
}

export interface SnapshotAssertion {
	/**
	 * Assert that `expected` is [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to a
	 * previously recorded [snapshot](https://github.com/concordancejs/concordance#serialization-details), or if
	 * necessary record a new snapshot.
	 */
	(expected: any, message?: string): void;

	/** Skip this assertion. */
	skip(expected: any, message?: string): void;
}

export interface ThrowsAssertion {
	/**
	 * Assert that the function throws [an error](https://www.npmjs.com/package/is-error). If so, returns the error value.
	 * The error must satisfy all expectations.
	 */
	<ThrownError extends Error>(fn: () => any, expectations?: ThrowsExpectation | null, message?: string): ThrownError;

	/** Skip this assertion. */
	skip(fn: () => any, expectations?: any, message?: string): void;
}

export interface ThrowsAsyncAssertion {
	/**
	 * Assert that the async function throws [an error](https://www.npmjs.com/package/is-error). If so, returns the error
	 * value. You must await the result.
	 */
	<ThrownError extends Error>(fn: () => PromiseLike<any>, expectations?: null, message?: string): Promise<ThrownError>;

	/**
	 * Assert that the async function throws [an error](https://www.npmjs.com/package/is-error). If so, returns the error
	 * value. You must await the result. The error must satisfy all expectations.
	 */
	<ThrownError extends Error>(fn: () => PromiseLike<any>, expectations: ThrowsExpectation, message?: string): Promise<ThrownError>;

	/**
	 * Assert that the promise rejects with [an error](https://www.npmjs.com/package/is-error). If so, returns the
	 * rejection reason. You must await the result.
	 */
	<ThrownError extends Error>(promise: PromiseLike<any>, expectations?: null, message?: string): Promise<ThrownError>;

	/**
	 * Assert that the promise rejects with [an error](https://www.npmjs.com/package/is-error). If so, returns the
	 * rejection reason. You must await the result. The error must satisfy all expectations.
	 */
	<ThrownError extends Error>(promise: PromiseLike<any>, expectations: ThrowsExpectation, message?: string): Promise<ThrownError>;

	/** Skip this assertion. */
	skip(thrower: any, expectations?: any, message?: string): void;
}

export interface TrueAssertion {
	/**
	 * Assert that `actual` is strictly true, returning a boolean indicating whether the assertion passed.
	 */
	(actual: any, message?: string): actual is true;

	/** Skip this assertion. */
	skip(actual: any, message?: string): void;
}

export interface TruthyAssertion {
	/**
	 * Assert that `actual` is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy), returning a boolean
	 * indicating whether the assertion passed.
	 */
	(actual: any, message?: string): boolean;

	/** Skip this assertion. */
	skip(actual: any, message?: string): void;
}

/** The `t` value passed to test & hook implementations. */
export interface ExecutionContext<Context = unknown> extends Assertions {
	/** Test context, shared with hooks. */
	context: Context;

	/** Title of the test or hook. */
	readonly title: string;

	/** Whether the test has passed. Only accurate in afterEach hooks. */
	readonly passed: boolean;

	log: LogFn;
	plan: PlanFn;
	teardown: TeardownFn;
	timeout: TimeoutFn;
	try: TryFn<Context>;
}

export interface LogFn {
	/** Log one or more values. */
	(...values: any[]): void;

	/** Skip logging. */
	skip(...values: any[]): void;
}

export interface PlanFn {
	/**
	 * Plan how many assertion there are in the test. The test will fail if the actual assertion count doesn't match the
	 * number of planned assertions. See [assertion planning](https://github.com/avajs/ava#assertion-planning).
	 */
	(count: number): void;

	/** Don't plan assertions. */
	skip(count: number): void;
}

export interface TimeoutFn {
	/**
	 * Set a timeout for the test, in milliseconds. The test will fail if the timeout is exceeded.
	 * The timeout is reset each time an assertion is made.
	 */
	(ms: number, message?: string): void;
}

export interface TeardownFn {
	/** Declare a function to be run after the test has ended. */
	(fn: () => void): void;
}

export type ImplementationFn<Args extends unknown[], Context = unknown> =
	((t: ExecutionContext<Context>, ...args: Args) => PromiseLike<void>) |
	((t: ExecutionContext<Context>, ...args: Args) => Subscribable) |
	((t: ExecutionContext<Context>, ...args: Args) => void);

export type TitleFn<Args extends unknown[]> = (providedTitle: string | undefined, ...args: Args) => string;

/** A reusable test or hook implementation. */
export type Macro<Args extends unknown[], Context = unknown> = {
	/** The function that is executed when the macro is used. */
	readonly exec: ImplementationFn<Args, Context>;

	/** Generates a test title when this macro is used. */
	readonly title?: TitleFn<Args>;
};

/** A test or hook implementation. */
export type Implementation<Args extends unknown[], Context = unknown> = ImplementationFn<Args, Context> | Macro<Args, Context>;

export interface TryFn<Context = unknown> {
	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail. The title may help distinguish attempts from one another.
	 */
	<Args extends unknown[]>(title: string, fn: Implementation<Args, Context>, ...args: Args): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail.
	 */
	<Args extends unknown[]>(fn: Implementation<Args, Context>, ...args: Args): Promise<TryResult>;
}

export interface AssertionError extends Error {}

export interface TryResult {
	/**
	* Title of the attempt, helping you tell attempts aparts.
	*/
	title: string;

	/**
	* Indicates whether all assertions passed, or at least one failed.
	*/
	passed: boolean;

	/**
	* Errors raised for each failed assertion.
	*/
	errors: AssertionError[];

	/**
	 * Logs created during the attempt using `t.log()`. Contains formatted values.
	 */
	logs: string[];

	/**
	 * Commit the attempt. Counts as one assertion for the plan count. If the
	 * attempt failed, calling this will also cause your test to fail.
	 */
	commit(options?: CommitDiscardOptions): void;

	/**
	 * Discard the attempt.
	 */
	discard(options?: CommitDiscardOptions): void;
}

export interface TestInterface<Context = unknown> {
	/** Declare a concurrent test. Additional arguments are passed along. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a concurrent test that uses a macro. The macro is responsible for generating a unique test title.
	 * Additional arguments are passed along.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests have passed. */
	after: AfterInterface<Context>;

	/** Declare a hook that is run after each passing test. */
	afterEach: AfterInterface<Context>;

	/** Declare a hook that is run once, before all tests. */
	before: BeforeInterface<Context>;

	/** Declare a hook that is run before each test. */
	beforeEach: BeforeInterface<Context>;

	/** Declare a test that is expected to fail. */
	failing: FailingInterface<Context>;

	/** Declare tests and hooks that are run serially. */
	serial: SerialInterface<Context>;

	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
	todo: TodoDeclaration;
	macro: MacroDeclaration<Context>;
	meta: MetaInterface;
}

export interface AfterInterface<Context = unknown> {
	/** Declare a hook that is run once, after all tests have passed. Additional arguments are passed along. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests have passed. Additional arguments are passed along. */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests are done. */
	always: AlwaysInterface<Context>;

	skip: HookSkipInterface<Context>;
}

export interface AlwaysInterface<Context = unknown> {
	/** Declare a hook that is run once, after all tests are done. Additional arguments are passed along. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests are done. Additional arguments are passed along. */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	skip: HookSkipInterface<Context>;
}

export interface BeforeInterface<Context = unknown> {
	/** Declare a hook that is run once, before all tests. Additional arguments are passed along. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, before all tests. Additional arguments are passed along. */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	skip: HookSkipInterface<Context>;
}

export interface FailingInterface<Context = unknown> {
	/** Declare a concurrent test. Additional arguments are passed along. The test is expected to fail. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a concurrent test that uses a macro. Additional arguments are passed along.
	 * The macro is responsible for generating a unique test title. The test is expected to fail.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
}

export interface HookSkipInterface<Context = unknown> {
	/** Skip this hook. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Skip this hook. */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;
}

export interface OnlyInterface<Context = unknown> {
	/** Declare a test. Additional arguments are passed along. Only this test and others declared with `.only()` are run. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a test that uses a macro. The macro is responsible for generating a unique test title.
	 * Only this test and others declared with `.only()` are run.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;
}

export interface SerialInterface<Context = unknown> {
	/** Declare a serial test. Additional arguments are passed along. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a serial test that uses a macro. The macro is responsible for generating a unique test title.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a serial hook that is run once, after all tests have passed. */
	after: AfterInterface<Context>;

	/** Declare a serial hook that is run after each passing test. */
	afterEach: AfterInterface<Context>;

	/** Declare a serial hook that is run once, before all tests. */
	before: BeforeInterface<Context>;

	/** Declare a serial hook that is run before each test. */
	beforeEach: BeforeInterface<Context>;

	/** Declare a serial test that is expected to fail. */
	failing: FailingInterface<Context>;

	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
	todo: TodoDeclaration;
}

export interface SkipInterface<Context = unknown> {
	/** Skip this test. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Skip this test. */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;
}

export interface TodoDeclaration {
	/** Declare a test that should be implemented later. */
	(title: string): void;
}

export type MacroDeclarationOptions<Args extends unknown[], Context = unknown> = {
	exec: ImplementationFn<Args, Context>;
	title: TitleFn<Args>;
};

export interface MacroDeclaration<Context = unknown> {
	/** Declare a reusable test implementation. */
	<Args extends unknown[]>(exec: ImplementationFn<Args, Context>): Macro<Args, Context>;
	<Args extends unknown[]>(declaration: MacroDeclarationOptions<Args, Context>): Macro<Args, Context>;
}

export interface MetaInterface {
	/** Path to the test file being executed. */
	file: string;

	/** Directory where snapshots are stored. */
	snapshotDirectory: string;
}

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestInterface;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
