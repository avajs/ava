import type {Assertions} from './assertions.js';
import type {Subscribable} from './subscribable.js';
import type {TryFn} from './try-fn.js';

/** The `t` value passed to test & hook implementations. */
export interface ExecutionContext<Context = unknown> extends Assertions {
	/** Test context, shared with hooks. */
	context: Context;

	/** Title of the test or hook. */
	readonly title: string;

	/** Whether the test has passed. Only accurate in afterEach hooks. */
	readonly passed: boolean;

	readonly log: LogFn;
	readonly plan: PlanFn;
	readonly teardown: TeardownFn;
	readonly timeout: TimeoutFn;
	readonly try: TryFn<Context>;
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

/**
 * Set a timeout for the test, in milliseconds. The test will fail if the timeout is exceeded.
 * The timeout is reset each time an assertion is made.
 */
export type TimeoutFn = (ms: number, message?: string) => void;

/** Declare a function to be run after the test has ended. */
export type TeardownFn = (fn: (() => Promise<void>) | (() => void)) => void;

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

export interface TestFn<Context = unknown> {
	/** Declare a concurrent test. Additional arguments are passed to the implementation or macro. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a concurrent test that uses a macro. Additional arguments are passed to the macro.
	 * The macro is responsible for generating a unique test title.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	after: AfterFn<Context>;
	afterEach: AfterFn<Context>;
	before: BeforeFn<Context>;
	beforeEach: BeforeFn<Context>;
	failing: FailingFn<Context>;
	macro: MacroFn<Context>;
	meta: Meta;
	only: OnlyFn<Context>;
	serial: SerialFn<Context>;
	skip: SkipFn<Context>;
	todo: TodoFn;
}

export interface AfterFn<Context = unknown> {
	/**
	 * Declare a hook that is run once, after all tests have passed.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a hook that is run once, after all tests have passed.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	always: AlwaysInterface<Context>;
	skip: HookSkipFn<Context>;
}

export interface AlwaysInterface<Context = unknown> {
	/**
	 * Declare a hook that is run once, after all tests are done.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a hook that is run once, after all tests are done.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	skip: HookSkipFn<Context>;
}

export interface BeforeFn<Context = unknown> {
	/**
	 * Declare a hook that is run once, before all tests.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a hook that is run once, before all tests.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	skip: HookSkipFn<Context>;
}

export interface FailingFn<Context = unknown> {
	/**
	 * Declare a concurrent test that is expected to fail.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a concurrent test, using a macro, that is expected to fail.
	 * Additional arguments are passed to the macro. The macro is responsible for generating a unique test title.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	only: OnlyFn<Context>;
	skip: SkipFn<Context>;
}

export interface HookSkipFn<Context = unknown> {
	/** Skip this hook. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Skip this hook. */
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;
}

export interface OnlyFn<Context = unknown> {
	/**
	 * Declare a test. Only this test and others declared with `.only()` are run.
	 * Additional arguments are passed to the implementation or macro.
	 */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a test that uses a macro. Only this test and others declared with `.only()` are run.
	 * Additional arguments are passed to the macro. The macro is responsible for generating a unique test title.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;
}

export interface SerialFn<Context = unknown> {
	/** Declare a serial test. Additional arguments are passed to the implementation or macro. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	 * Declare a serial test that uses a macro. The macro is responsible for generating a unique test title.
	 */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	after: AfterFn<Context>;
	afterEach: AfterFn<Context>;
	before: BeforeFn<Context>;
	beforeEach: BeforeFn<Context>;
	failing: FailingFn<Context>;
	only: OnlyFn<Context>;
	skip: SkipFn<Context>;
	todo: TodoFn;
}

export interface SkipFn<Context = unknown> {
	/** Skip this test. */
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/** Skip this test. */
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;
}

/** Declare a test that should be implemented later. */
export type TodoFn = (title: string) => void;

export type MacroDeclarationOptions<Args extends unknown[], Context = unknown> = {
	/** The function that is executed when the macro is used. */
	exec: ImplementationFn<Args, Context>;

	/** The function responsible for generating a unique title when the macro is used. */
	title: TitleFn<Args>;
};

export interface MacroFn<Context = unknown> {
	/** Declare a reusable test implementation. */
	<Args extends unknown[]>(/** The function that is executed when the macro is used. */ exec: ImplementationFn<Args, Context>): Macro<Args, Context>;
	<Args extends unknown[]>(declaration: MacroDeclarationOptions<Args, Context>): Macro<Args, Context>;
}

export interface Meta {
	/** Path to the test file being executed. */
	file: string;

	/** Directory where snapshots are stored. */
	snapshotDirectory: string;
}
