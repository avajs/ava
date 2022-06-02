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
	message?: string | RegExp | ((message: string) => boolean);

	/** The thrown error must have a name that equals the given string. */
	name?: string;
};

export interface Assertions {
	/**
	 * Assert that `actual` is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy), returning a boolean
	 * indicating whether the assertion passed.
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
	 * indicating whether the assertion passed.
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

	/**
	 * Assert that `actual` is [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to
	 * `expected`, returning a boolean indicating whether the assertion passed.
	 */
	<Actual extends Expected, Expected>(actual: Actual, expected: Expected, message?: string): expected is Actual;

	/**
	 * Assert that `actual` is [deeply equal](https://github.com/concordancejs/concordance#comparison-details) to
	 * `expected`, returning a boolean indicating whether the assertion passed.
	 */
	<Actual, Expected>(actual: Actual, expected: Expected, message?: string): boolean;

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
	 * The error must satisfy all expectations. Returns undefined when the assertion fails.
	 */
	<ThrownError extends Error>(fn: () => any, expectations?: ThrowsExpectation, message?: string): ThrownError | undefined;

	/** Skip this assertion. */
	skip(fn: () => any, expectations?: any, message?: string): void;
}

export interface ThrowsAsyncAssertion {
	/**
	 * Assert that the async function throws [an error](https://www.npmjs.com/package/is-error). If so, returns the error
	 * value. Returns undefined when the assertion fails. You must await the result. The error must satisfy all expectations.
	 */
	<ThrownError extends Error>(fn: () => PromiseLike<any>, expectations?: ThrowsExpectation, message?: string): Promise<ThrownError | undefined>;

	/**
	 * Assert that the promise rejects with [an error](https://www.npmjs.com/package/is-error). If so, returns the
	 * rejection reason. Returns undefined when the assertion fails. You must await the result. The error must satisfy all
	 * expectations.
	 */
	<ThrownError extends Error>(promise: PromiseLike<any>, expectations?: ThrowsExpectation, message?: string): Promise<ThrownError | undefined>;

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
