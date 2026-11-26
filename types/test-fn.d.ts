import type {Assertions} from './assertions.js';
import type {Subscribable} from './subscribable.js';
import type {TryFn} from './try-fn.js';

/**
The `t` value passed to tests, setup functions, and postconditions.
*/
export type ExecutionContext<Context = unknown> = {
	/**
	Test context, shared with setup functions and postconditions.
	*/
	context: Context;

	/**
	Title of the test, setup function, or postcondition.
	*/
	readonly title: string;

	/**
	Whether the test has passed. In postconditions, only meaningful in `afterEach` and `afterEach.always`.
	*/
	readonly passed: boolean;

	readonly log: LogFn;
	readonly plan: PlanFn;
	/**
	Register cleanup for a test or setup function.
	*/
	readonly teardown: TeardownFn;
	readonly timeout: TimeoutFn;
	readonly try: TryFn<Context>;
} & Assertions;

export type LogFn = {
	/**
	Log one or more values.
	*/
	(...values: any[]): void;

	/**
	Skip logging.
	*/
	skip(...values: any[]): void;
};

export type PlanFn = {
	/**
	Plan how many assertion there are in the test. The test will fail if the actual assertion count doesn't match the
	number of planned assertions. See [assertion planning](https://github.com/avajs/ava#assertion-planning).
	*/
	(count: number): void;

	/**
	Don't plan assertions.
	*/
	skip(count: number): void;
};

export type TimeoutFn = {
	/**
	Set a timeout for the test, in milliseconds. The test will fail if the timeout is exceeded.
	The timeout is reset each time an assertion is made.
	*/
	(ms: number, message?: string): void;

	/**
	Clear the timeout and restore the default behavior.
	*/
	clear(): void;
};

/**
Register cleanup for a test or setup function. Callbacks and disposable objects are
run serially in reverse registration order. Async disposal takes precedence.

In tests cleanup runs before `afterEach` postconditions. In `beforeEach` functions it runs after
the test's postconditions. In `before` functions it runs after the file's postconditions.
*/
export type TeardownFn = (fn: (() => Promise<void>) | (() => void) | Disposable | AsyncDisposable) => void;

export type ImplementationFn<Args extends unknown[], Context = unknown> =
	((t: ExecutionContext<Context>, ...args: Args) => PromiseLike<void>) |
	((t: ExecutionContext<Context>, ...args: Args) => Subscribable) |
	((t: ExecutionContext<Context>, ...args: Args) => void);

export type TitleFn<Args extends unknown[]> = (providedTitle: string | undefined, ...args: Args) => string;

/**
A reusable test, setup function, or postcondition.
*/
export type Macro<Args extends unknown[], Context = unknown> = {
	/**
	The function that is executed when the macro is used.
	*/
	readonly exec: ImplementationFn<Args, Context>;

	/**
	Generates a test title when this macro is used.
	*/
	readonly title?: TitleFn<Args>;
};

/**
A test, setup function, or postcondition implementation.
*/
export type Implementation<Args extends unknown[], Context = unknown> = ImplementationFn<Args, Context> | Macro<Args, Context>;

export type TestFn<Context = unknown> = {
	/**
	Declare a concurrent test. Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Declare a concurrent test that uses a macro. Additional arguments are passed to the macro.
	The macro is responsible for generating a unique test title.
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
	/**
	Declare a test that only runs when `shouldRun` is true; otherwise the test is skipped.
	*/
	runIf: RunIfFn<TestFn<Context>>;
	serial: SerialFn<Context>;
	skip: SkipFn<Context>;
	/**
	Declare a test that is skipped when `shouldSkip` is true.
	*/
	skipIf: SkipIfFn<TestFn<Context>>;
	/**
	Declare a test that should be implemented later.
	*/
	todo: TodoFn;
};

export type AfterFn<Context = unknown> = {
	/**
	Declare a postcondition that runs after the associated test or test file passes.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Declare a postcondition that runs after the associated test or test file passes.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	always: AlwaysInterface<Context>;
	skip: LifecycleSkipFn<Context>;
};

export type AlwaysInterface<Context = unknown> = {
	/**
	Declare a postcondition that runs after the associated test or test file, even after earlier failures.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Declare a postcondition that runs after the associated test or test file, even after earlier failures.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	skip: LifecycleSkipFn<Context>;
};

export type BeforeFn<Context = unknown> = {
	/**
	Declare a setup function or precondition that runs before the associated test or test file.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Declare a setup function or precondition that runs before the associated test or test file.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;

	skip: LifecycleSkipFn<Context>;
};

export type FailingFn<Context = unknown> = {
	/**
	Declare a concurrent test that is expected to fail.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Declare a concurrent test, using a macro, that is expected to fail.
	Additional arguments are passed to the macro. The macro is responsible for generating a unique test title.
	*/
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	only: OnlyFn<Context>;
	/**
	Declare a test that only runs when `shouldRun` is true; otherwise the test is skipped.
	*/
	runIf: RunIfFn<FailingFn<Context>>;
	skip: SkipFn<Context>;
	/**
	Declare a test that is skipped when `shouldSkip` is true.
	*/
	skipIf: SkipIfFn<FailingFn<Context>>;
};

export type LifecycleSkipFn<Context = unknown> = {
	/**
	Skip this setup function or postcondition.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Skip this setup function or postcondition.
	*/
	<Args extends unknown[]>(implementation: Implementation<Args, Context>, ...args: Args): void;
};

// TODO: Remove `HookSkipFn` in a future major release.
/**
@deprecated Use `LifecycleSkipFn` instead.
*/
export type HookSkipFn<Context = unknown> = LifecycleSkipFn<Context>;

export type OnlyFn<Context = unknown> = {
	/**
	Declare a test. Only this test and others declared with `.only()` are run.
	Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Declare a test that uses a macro. Only this test and others declared with `.only()` are run.
	Additional arguments are passed to the macro. The macro is responsible for generating a unique test title.
	*/
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;
};

/**
Declare a test that only runs when `shouldRun` is true; otherwise the test is skipped.
*/
export type RunIfFn<Chain> = (shouldRun: boolean) => Chain;

export type SerialFn<Context = unknown> = {
	/**
	Declare a serial test. Additional arguments are passed to the implementation or macro.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Declare a serial test that uses a macro. The macro is responsible for generating a unique test title.
	*/
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;

	after: AfterFn<Context>;
	afterEach: AfterFn<Context>;
	before: BeforeFn<Context>;
	beforeEach: BeforeFn<Context>;
	failing: FailingFn<Context>;
	only: OnlyFn<Context>;
	/**
	Declare a test that only runs when `shouldRun` is true; otherwise the test is skipped.
	*/
	runIf: RunIfFn<SerialFn<Context>>;
	skip: SkipFn<Context>;
	/**
	Declare a test that is skipped when `shouldRun` is true.
	*/
	skipIf: SkipIfFn<SerialFn<Context>>;
	/**
	Declare a test that should be implemented later.
	*/
	todo: TodoFn;
};

export type SkipFn<Context = unknown> = {
	/**
	Skip this test.
	*/
	<Args extends unknown[]>(title: string, implementation: Implementation<Args, Context>, ...args: Args): void;

	/**
	Skip this test.
	*/
	<Args extends unknown[]>(macro: Macro<Args, Context>, ...args: Args): void;
};

/**
Declare a test that is skipped when `shouldSkip` is true.
*/
export type SkipIfFn<Chain> = (shouldSkip: boolean) => Chain;

/**
Declare a test that should be implemented later.
*/
export type TodoFn = (title: string) => void;

export type MacroDeclarationOptions<Args extends unknown[], Context = unknown> = {
	/**
	The function that is executed when the macro is used.
	*/
	exec: ImplementationFn<Args, Context>;

	/**
	The function responsible for generating a unique title when the macro is used.
	*/
	title: TitleFn<Args>;
};

export type MacroFn<Context = unknown> = {
	/**
	Declare a reusable test implementation.
	*/
	<Args extends unknown[]>(/** The function that is executed when the macro is used. */ exec: ImplementationFn<Args, Context>): Macro<Args, Context>;
	<Args extends unknown[]>(declaration: MacroDeclarationOptions<Args, Context>): Macro<Args, Context>;
};

export type Meta = {
	/**
	Path to the test file being executed.
	*/
	file: string;

	/**
	Directory where snapshots are stored.
	*/
	snapshotDirectory: string;

	/**
	Whether AVA is running with a debugger attached (or via the `debug` command).
	When `true`, the timeout option has been disabled to help with debugging.
	*/
	debugMode: boolean;
};
