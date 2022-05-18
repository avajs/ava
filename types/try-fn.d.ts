import type {Implementation} from './test-fn.js';

export type CommitDiscardOptions = {
	/**
	 * Whether the logs should be included in those of the parent test.
	 */
	retainLogs?: boolean;
};

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

