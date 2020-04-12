export {
	AssertAssertion,
	AssertionError,
	Assertions,
	CommitDiscardOptions,
	Constructor,
	DeepEqualAssertion,
	FailAssertion,
	FalseAssertion,
	FalsyAssertion,
	ImplementationResult,
	IsAssertion,
	LogFn,
	MetaInterface,
	NotAssertion,
	NotDeepEqualAssertion,
	NotRegexAssertion,
	NotThrowsAssertion,
	NotThrowsAsyncAssertion,
	PassAssertion,
	PlanFn,
	RegexAssertion,
	SnapshotAssertion,
	SnapshotOptions,
	Subscribable,
	ThrowsAssertion,
	ThrowsAsyncAssertion,
	ThrowsExpectation,
	TimeoutFn,
	TrueAssertion,
	TruthyAssertion,
	TryResult
} from '.';

import {
	Assertions,
	ImplementationResult,
	MetaInterface,
	LogFn,
	PlanFn,
	TimeoutFn,
	TryResult
} from '.';

export type ExecutionContext<Context = unknown, ExtraAssertions = unknown> = Assertions & ExtraAssertions & {
	/** Test context, shared with hooks. */
	context: Context;

	/** Title of the test or hook. */
	readonly title: string;

	/** Whether the test has passed. Only accurate in afterEach hooks. */
	readonly passed: boolean;

	log: LogFn;
	plan: PlanFn;
	timeout: TimeoutFn;
	try: TryFn<Context, ExtraAssertions>;
};

export interface TryFn<Context = unknown, ExtraAssertions = unknown> {
	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail. The title may help distinguish attempts from one another.
	 */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail. The title may help distinguish attempts from one another.
	 */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail. A macro may be provided. The title may help distinguish attempts from
	 * one another.
	 */
	(title: string, macro: Macro<[], Context, ExtraAssertions>): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail. A macro may be provided.
	 */
	<Args extends any[]> (title: string, macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail.
	 */
	(implementation: Implementation<Context, ExtraAssertions>): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail.
	 */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail. A macro may be provided.
	 */
	(macro: Macro<[], Context, ExtraAssertions>): Promise<TryResult>;

	/**
	 * Attempt to run some assertions. The result must be explicitly committed or discarded or else
	 * the test will fail. A macro may be provided.
	 */
	<Args extends any[]> (macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): Promise<TryResult>;
}

export type Implementation<Context = unknown, ExtraAssertions = unknown> = (t: ExecutionContext<Context, ExtraAssertions>) => ImplementationResult;
export type ImplementationWithArgs<Args extends any[], Context = unknown, ExtraAssertions = unknown> = (t: ExecutionContext<Context, ExtraAssertions>, ...args: Args) => ImplementationResult;

export type Macro<Args extends any[] = [], Context = unknown, ExtraAssertions = unknown> = {
	exec (t: ExecutionContext<Context, ExtraAssertions>, ...args: Args): ImplementationResult;
	title? (providedTitle?: string, ...args: Args): string;
};

export interface MacroInterface<InheritedContext = unknown, ExtraAssertions = unknown> {
	<Args extends any[] = [], Context = InheritedContext> (implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>): Macro<Args, Context, ExtraAssertions>;
	<Args extends any[] = [], Context = InheritedContext> (macro: Macro<Args, Context, ExtraAssertions>): Macro<Args, Context, ExtraAssertions>;
}

export interface TestInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Declare a concurrent test. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a concurrent test. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a concurrent test. */
	(title: string, macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a concurrent test. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a concurrent test. */
	(macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a concurrent test. */
	<Args extends any[]> (macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests have passed. */
	after: AfterInterface<Context, ExtraAssertions>;

	/** Declare a hook that is run after each passing test. */
	afterEach: AfterInterface<Context, ExtraAssertions>;

	/** Declare a hook that is run once, before all tests. */
	before: BeforeInterface<Context, ExtraAssertions>;

	/** Declare a hook that is run before each test. */
	beforeEach: BeforeInterface<Context, ExtraAssertions>;

	/** Create a macro you can reuse in multiple tests. */
	macro: MacroInterface<Context, ExtraAssertions>;

	/** Declare a test that is expected to fail. */
	failing: FailingInterface<Context, ExtraAssertions>;

	/** Declare tests and hooks that are run serially. */
	serial: SerialInterface<Context, ExtraAssertions>;

	only: OnlyInterface<Context, ExtraAssertions>;
	skip: SkipInterface<Context, ExtraAssertions>;
	todo: TodoDeclaration;
	meta: MetaInterface;
}

export interface AfterInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Declare a hook that is run once, after all tests have passed. */
	(implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a hook that is run once, after all tests have passed. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests have passed. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a hook that is run once, after all tests have passed. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests are done. */
	always: AlwaysInterface<Context, ExtraAssertions>;

	skip: HookSkipInterface<Context, ExtraAssertions>;
}

export interface AlwaysInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Declare a hook that is run once, after all tests are done. */
	(implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a hook that is run once, after all tests are done. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests are done. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a hook that is run once, after all tests are done. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	skip: HookSkipInterface<Context, ExtraAssertions>;
}

export interface BeforeInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Declare a hook that is run once, before all tests. */
	(implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a hook that is run once, before all tests. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a hook that is run once, before all tests. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a hook that is run once, before all tests. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	skip: HookSkipInterface<Context, ExtraAssertions>;
}

export interface FailingInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Declare a test that is is expected to fail. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a test that is is expected to fail. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a test that is is expected to fail. */
	(title: string, macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a test that is is expected to fail. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a test that is is expected to fail. */
	(macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a test that is is expected to fail. */
	<Args extends any[]> (macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	only: OnlyInterface<Context, ExtraAssertions>;
	skip: SkipInterface<Context, ExtraAssertions>;
}

export interface HookSkipInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Skip this hook. */
	(implementation: Implementation<Context, ExtraAssertions>): void;

	/** Skip this hook. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Skip this hook. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Skip this hook. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;
}

export interface OnlyInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Declare a test. Only this test and others declared with `.only()` are run. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	(title: string, macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	(macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	<Args extends any[]> (macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;
}

export interface SerialInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Declare a serial test. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Declare a serial test. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a serial test. */
	(title: string, macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a serial test. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a serial test. */
	(macro: Macro<[], Context, ExtraAssertions>): void;

	/** Declare a serial test. */
	<Args extends any[]> (macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Declare a serial hook that is run once, after all tests have passed. */
	after: AfterInterface<Context, ExtraAssertions>;

	/** Declare a serial hook that is run after each passing test. */
	afterEach: AfterInterface<Context, ExtraAssertions>;

	/** Declare a serial hook that is run once, before all tests. */
	before: BeforeInterface<Context, ExtraAssertions>;

	/** Declare a serial hook that is run before each test. */
	beforeEach: BeforeInterface<Context, ExtraAssertions>;

	/** Create a macro you can reuse in multiple tests. */
	macro: MacroInterface<Context, ExtraAssertions>;

	/** Declare a serial test that is expected to fail. */
	failing: FailingInterface<Context, ExtraAssertions>;

	only: OnlyInterface<Context, ExtraAssertions>;
	skip: SkipInterface<Context, ExtraAssertions>;
	todo: TodoDeclaration;
}

export interface SkipInterface<Context = unknown, ExtraAssertions = unknown> {
	/** Skip this test. */
	(title: string, implementation: Implementation<Context, ExtraAssertions>): void;

	/** Skip this test. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Skip this test. */
	(title: string, macro: Macro<[], Context, ExtraAssertions>): void;

	/** Skip this test. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;

	/** Skip this test. */
	(macro: Macro<[], Context, ExtraAssertions>): void;

	/** Skip this test. */
	<Args extends any[]> (macro: Macro<Args, Context, ExtraAssertions>, ...args: Args): void;
}

export interface TodoDeclaration {
	/** Declare a test that should be implemented later. */
	(title: string): void;
}

export interface ForkableSerialInterface<Context = unknown, ExtraAssertions = unknown> extends SerialInterface<Context> {
	/** Create a new serial() function with its own hooks. */
	fork(): ForkableSerialInterface<Context, ExtraAssertions>;
}

export interface ForkableTestInterface<Context = unknown, ExtraAssertions = unknown> extends TestInterface<Context> {
	/** Create a new test() function with its own hooks. */
	fork(): ForkableTestInterface<Context, ExtraAssertions>;

	/** Declare tests and hooks that are run serially. */
	serial: ForkableSerialInterface<Context, ExtraAssertions>;
}

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestInterface & {
	/** Create a new test() function with its own hooks. */
	make(): ForkableTestInterface;
};

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
