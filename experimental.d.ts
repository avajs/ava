export {
	AssertAssertion,
	AssertionError,
	Assertions,
	CommitDiscardOptions,
	Constructor,
	DeepEqualAssertion,
	ExecutionContext,
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
	TryFn,
	TryResult
} from '.';

import {ExecutionContext, ImplementationResult, MetaInterface} from '.';

export type Implementation<Context = unknown> = (t: ExecutionContext<Context>) => ImplementationResult;
export type ImplementationWithArgs<Args extends any[], Context = unknown> = (t: ExecutionContext<Context>, ...args: Args) => ImplementationResult;

export type Macro<Args extends any[] = [], Context = unknown> = {
	exec (t: ExecutionContext<Context>, ...args: Args): ImplementationResult;
	title? (providedTitle?: string, ...args: Args): string;
};

export interface MacroInterface<InheritedContext = unknown> {
	<Args extends any[] = [], Context = InheritedContext> (implementation: ImplementationWithArgs<Args, Context>): Macro<Args, Context>;
	<Args extends any[] = [], Context = InheritedContext> (macro: Macro<Args, Context>): Macro<Args, Context>;
}

export interface TestInterface<Context = unknown> {
	/** Declare a concurrent test. */
	(title: string, implementation: Implementation<Context>): void;

	/** Declare a concurrent test. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a concurrent test. */
	(title: string, macro: Macro<[], Context>): void;

	/** Declare a concurrent test. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a concurrent test. */
	(macro: Macro<[], Context>): void;

	/** Declare a concurrent test. */
	<Args extends any[]> (macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests have passed. */
	after: AfterInterface<Context>;

	/** Declare a hook that is run after each passing test. */
	afterEach: AfterInterface<Context>;

	/** Declare a hook that is run once, before all tests. */
	before: BeforeInterface<Context>;

	/** Declare a hook that is run before each test. */
	beforeEach: BeforeInterface<Context>;

	/** Create a macro you can reuse in multiple tests. */
	macro: MacroInterface<Context>;

	/** Declare a test that is expected to fail. */
	failing: FailingInterface<Context>;

	/** Declare tests and hooks that are run serially. */
	serial: SerialInterface<Context>;

	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
	todo: TodoDeclaration;
	meta: MetaInterface;
}

export interface AfterInterface<Context = unknown> {
	/** Declare a hook that is run once, after all tests have passed. */
	(implementation: Implementation<Context>): void;

	/** Declare a hook that is run once, after all tests have passed. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests have passed. */
	(title: string, implementation: Implementation<Context>): void;

	/** Declare a hook that is run once, after all tests have passed. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests are done. */
	always: AlwaysInterface<Context>;

	skip: HookSkipInterface<Context>;
}

export interface AlwaysInterface<Context = unknown> {
	/** Declare a hook that is run once, after all tests are done. */
	(implementation: Implementation<Context>): void;

	/** Declare a hook that is run once, after all tests are done. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, after all tests are done. */
	(title: string, implementation: Implementation<Context>): void;

	/** Declare a hook that is run once, after all tests are done. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	skip: HookSkipInterface<Context>;
}

export interface BeforeInterface<Context = unknown> {
	/** Declare a hook that is run once, before all tests. */
	(implementation: Implementation<Context>): void;

	/** Declare a hook that is run once, before all tests. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a hook that is run once, before all tests. */
	(title: string, implementation: Implementation<Context>): void;

	/** Declare a hook that is run once, before all tests. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	skip: HookSkipInterface<Context>;
}

export interface FailingInterface<Context = unknown> {
	/** Declare a test that is is expected to fail. */
	(title: string, implementation: Implementation<Context>): void;

	/** Declare a test that is is expected to fail. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a test that is is expected to fail. */
	(title: string, macro: Macro<[], Context>): void;

	/** Declare a test that is is expected to fail. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a test that is is expected to fail. */
	(macro: Macro<[], Context>): void;

	/** Declare a test that is is expected to fail. */
	<Args extends any[]> (macro: Macro<Args, Context>, ...args: Args): void;

	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
}

export interface HookSkipInterface<Context = unknown> {
	/** Skip this hook. */
	(implementation: Implementation<Context>): void;

	/** Skip this hook. */
	<Args extends any[]> (implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Skip this hook. */
	(title: string, implementation: Implementation<Context>): void;

	/** Skip this hook. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;
}

export interface OnlyInterface<Context = unknown> {
	/** Declare a test. Only this test and others declared with `.only()` are run. */
	(title: string, implementation: Implementation<Context>): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	(title: string, macro: Macro<[], Context>): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	(macro: Macro<[], Context>): void;

	/** Declare a test. Only this test and others declared with `.only()` are run. */
	<Args extends any[]> (macro: Macro<Args, Context>, ...args: Args): void;
}

export interface SerialInterface<Context = unknown> {
	/** Declare a serial test. */
	(title: string, implementation: Implementation<Context>): void;

	/** Declare a serial test. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Declare a serial test. */
	(title: string, macro: Macro<[], Context>): void;

	/** Declare a serial test. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a serial test. */
	(macro: Macro<[], Context>): void;

	/** Declare a serial test. */
	<Args extends any[]> (macro: Macro<Args, Context>, ...args: Args): void;

	/** Declare a serial hook that is run once, after all tests have passed. */
	after: AfterInterface<Context>;

	/** Declare a serial hook that is run after each passing test. */
	afterEach: AfterInterface<Context>;

	/** Declare a serial hook that is run once, before all tests. */
	before: BeforeInterface<Context>;

	/** Declare a serial hook that is run before each test. */
	beforeEach: BeforeInterface<Context>;

	/** Create a macro you can reuse in multiple tests. */
	macro: MacroInterface<Context>;

	/** Declare a serial test that is expected to fail. */
	failing: FailingInterface<Context>;

	only: OnlyInterface<Context>;
	skip: SkipInterface<Context>;
	todo: TodoDeclaration;
}

export interface SkipInterface<Context = unknown> {
	/** Skip this test. */
	(title: string, implementation: Implementation<Context>): void;

	/** Skip this test. */
	<Args extends any[]> (title: string, implementation: ImplementationWithArgs<Args, Context>, ...args: Args): void;

	/** Skip this test. */
	(title: string, macro: Macro<[], Context>): void;

	/** Skip this test. */
	<Args extends any[]> (title: string, macro: Macro<Args, Context>, ...args: Args): void;

	/** Skip this test. */
	(macro: Macro<[], Context>): void;

	/** Skip this test. */
	<Args extends any[]> (macro: Macro<Args, Context>, ...args: Args): void;
}

export interface TodoDeclaration {
	/** Declare a test that should be implemented later. */
	(title: string): void;
}

/** Call to declare a test, or chain to declare hooks or test modifiers */
declare const test: TestInterface;

/** Call to declare a test, or chain to declare hooks or test modifiers */
export default test;
