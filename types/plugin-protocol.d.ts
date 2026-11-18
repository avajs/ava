// Experimental and internal: not exported from any entrypoint.
import type {SerializedError} from './state-change-events.js';

export namespace Plugin {
	/**
	Names a version of the protocol. Plugins list the identifiers they can speak, in order of preference, and AVA picks
	the first one it supports. Identifiers are named after the AVA version they were introduced in. Until the first
	release that includes this protocol it is `experimental`, and may change without notice.
	*/
	export type ProtocolIdentifier = 'experimental';

	/**
	The roles a plugin can take. `reporter`: receives run messages and renders them. A reporter may claim stdout,
	making it the one that produces AVA's output.
	*/
	export type Capability = 'reporter';

	// --- What the plugin's entry point and the negotiated protocol offer (runs inside the plugin's worker thread) ---

	export type FactoryOptions = {
		/**
		Negotiates the protocol with AVA, passing it the plugin. `supported` lists the identifiers the plugin can speak.

		The promise settles once AVA has started up as far as this plugin is concerned: AVA has parsed argv (using the
		plugin's `flags`), and called the plugin's `configure()`. It then resolves with the protocol, so plugins never
		need to check for the plugin being inactive.

		It rejects if the plugin won't take part in this invocation: either AVA fails startup because of the plugin (for
		instance none of the identifiers are supported, or `configure()` returned an `error` diagnostic), in which case AVA
		reports that to the user, or the plugin is not active (`configure()` returned `active: false`), in which case the
		plugin quietly ends. Plugins must not handle the rejection, which is what ends the plugin. Cleanup belongs in
		`finally` blocks.
		*/
		negotiateProtocol<Options = unknown, Capabilities extends Capability = Capability>(
			supported: readonly [ProtocolIdentifier],
			plugin: Plugin<Options, Capabilities>,
		): Promise<Protocol<Capabilities>>;
		// Add overloads for additional protocols.
	};

	/**
	The default export of a plugin's entry point. The returned promise should settle once the plugin is done, which is
	after `Protocol.observe()` has resolved. It rejects if `negotiateProtocol()` did.
	*/
	export type Factory = (options: FactoryOptions) => void | Promise<void>;

	/**
	What a plugin knows about the AVA that loaded it. Available both when configuring and once active.
	*/
	export type ProtocolInfo = {
		/**
		The AVA version that is loading the plugin.
		*/
		readonly ava: {readonly version: string};
		/**
		The protocol that was negotiated.
		*/
		readonly identifier: ProtocolIdentifier;
		/**
		Absolute path of the project directory, which may differ from the process's working directory. Relative file names
		should be computed against it.
		*/
		readonly projectDir: string;
		/**
		Characteristics of AVA's output. These can't be reliably detected in a plugin's worker thread, so AVA passes them
		on.
		*/
		readonly terminal: {
			readonly stdout: {
				/**
				How much color the output supports, on the same scale as chalk's `level`: 0 for none, 1 for basic (16
				colors), 2 for 256 colors and 3 for true color. It's what AVA decided, taking `--color`/`--no-color`,
				`FORCE_COLOR`, `NO_COLOR` and the terminal into account. Plugins should use it, rather than detect color
				support themselves, to style output the same way AVA does.
				*/
				readonly colorLevel: 0 | 1 | 2 | 3;
			};
		};
	};

	/**
	What an active plugin can do, depending on the capabilities it declared: the protocol only has the parts for those
	capabilities, so a plugin without the `reporter` capability can't call `observe()`. It is not available to
	`configure()`, which gets a `ConfigureContext` instead, since the plugin isn't known to be active yet.
	*/
	export type Protocol<Capabilities extends Capability = Capability> = ProtocolInfo
		& ('reporter' extends Capabilities ? ReporterProtocol : unknown);

	/**
	The parts of the protocol for plugins with the `reporter` capability.
	*/
	export type ReporterProtocol = {
		/**
		Calls `handler` with an iterator of run messages, and tells AVA the plugin is ready: AVA emits nothing until every
		active plugin has called `observe()`, which must happen shortly after `negotiateProtocol()` resolves (currently
		within 10 seconds).

		The iterator completes after the `end-of-stream` message. The plugin is expected to consume it until then, and
		to have flushed everything it intends to write before `handler` returns. If `handler` returns earlier, AVA
		treats the handler as done and stops passing it messages. If `handler` throws or rejects, AVA treats it as a
		crash of the plugin.

		AVA waits for messages with `sync: true` to be handled before it continues, so that output is flushed at those
		points. A message counts as handled when the handler asks the iterator for the next message. For `end-of-stream`
		that's when `handler` returns.

		It can be called more than once. Each call gets its own iterator and handler, and a message is acknowledged once
		every handler that's still running has finished handling it. There is no replay: a handler only gets messages
		delivered after its `observe()` call, so call it in the same turn as the first if it needs everything.

		The returned promise settles when `handler` does.
		*/
		observe(handler: (messages: AsyncIterableIterator<RunMessage>) => Promise<void>): Promise<void>;
	};

	/**
	Describes a plugin to AVA. It's passed to `negotiateProtocol()`.
	*/
	export type Plugin<Options = unknown, Capabilities extends Capability = Capability> = {
		/**
		The plugin's own version, which AVA includes in compatibility errors.
		*/
		readonly version: string;

		/**
		The roles the plugin takes part in. Determines which parts of the protocol the plugin gets, and which fields it can
		use in the result of `configure()`.
		*/
		readonly capabilities: readonly Capabilities[];

		/**
		Prefix for this plugin's flags: every flag must be named exactly this or start with `<namespace>-`. Must be a
		lowercase identifier that no other plugin or AVA flag uses.
		*/
		readonly namespace: string;

		/**
		Flags to add to the CLI, by name (without leading dashes). AVA needs them to parse argv before `configure()` is
		called, so they must be static: they can't depend on the plugin's options or on parsed values. They must be
		structured-cloneable.
		*/
		readonly flags?: Readonly<Record<string, FlagDefinition>>;

		/**
		Called once, after config is loaded and argv is parsed, while `negotiateProtocol()` is pending. This is where the
		plugin validates its options and flags, and decides whether it is active for this invocation.
		*/
		configure(context: ConfigureContext<Options>): ConfigureResult<NoInfer<Capabilities>> | Promise<ConfigureResult<NoInfer<Capabilities>>>;
	};

	export type FlagDefinition = {
		/**
		How the flag's value is parsed. Booleans can be negated with a `no-` prefix.
		*/
		readonly type: 'boolean' | 'string' | 'number';
		/**
		Shown in the CLI's `--help` output.
		*/
		readonly description: string;
	};

	/**
	What `configure()` can see: what the plugin knows about AVA, and how it was invoked. It's the view of the protocol
	before the plugin is active, so it deliberately lacks `observe()`. Fields can be added within a protocol level.
	*/
	export type ConfigureContext<Options = unknown> = ProtocolInfo & {
		/**
		The plugin's options from the AVA configuration, if any. Must be structured-cloneable.
		*/
		readonly options: Options | undefined;
		/**
		Parsed values for the flags declared by this plugin only. Unset flags are `undefined`.
		*/
		readonly flags: Readonly<Record<string, unknown>>;
		/**
		How AVA was invoked, for plugins that can't work in every mode.
		*/
		readonly mode: {
			/**
			Whether watch mode is enabled.
			*/
			readonly watch: boolean;
			/**
			Whether AVA was started with `ava debug`.
			*/
			readonly debug: boolean;
		};
	};

	export type Diagnostic = {
		/**
		`error` aborts startup, `warning` is reported but doesn't prevent the run.
		*/
		readonly level: 'error' | 'warning';
		/**
		What the user should see.
		*/
		readonly message: string;
	};

	export type ConfigureResult<Capabilities extends Capability = Capability> = {
		/**
		If `false`, `negotiateProtocol()` rejects, the plugin receives no run messages and its thread is shut down without
		this being reported as an error.
		*/
		readonly active: boolean;
		/**
		Any `error` diagnostic aborts startup, and AVA reports it to the user. `warning` diagnostics are reported too.
		*/
		readonly diagnostics?: readonly Diagnostic[];
	} & ('reporter' extends Capabilities ? {
		/**
		Requires the `reporter` capability. At most one active plugin may claim stdout. While claimed, AVA itself writes
		nothing to it, so the plugin is the only writer.
		*/
		readonly claims?: ReadonlyArray<'stdout'>;
	} : {
		/**
		Not available without the `reporter` capability.
		*/
		readonly claims?: never;
	});

	// --- Run messages (what `observe()` delivers) ---

	/**
	What reporters need to know about a run up front. Fields can be added within a protocol level, but not removed or
	reshaped.
	*/
	export type RunPlan = {
		/**
		Display prefixes for test titles, keyed by the absolute path of the test file (as found in `testFile` on events).
		Empty when titles shouldn't be prefixed, which is the case when only one file is run. The prefix is the path
		leading to the test file, shortened for display: the common directory prefix, `__tests__` directories,
		`.test`/`.spec`/`test-` markers and the extension are removed. The last element is the shortened file name.
		Joining the elements and the title, and styling the separator, is up to the reporter.
		*/
		readonly titlePrefixes: ReadonlyMap<string, readonly string[]>;
	};

	/**
	Hooks that were started but had not finished, by absolute test file path and then title.
	*/
	export type PendingHooks = ReadonlyMap<string, ReadonlySet<string>>;

	/**
	Tests that were started but had not finished, by absolute test file path and then title.
	*/
	export type PendingTests = ReadonlyMap<string, ReadonlySet<string>>;

	/**
	Describes something that happened during a run.

	Run messages are delivered using structured clone, so events can contain more than JSON: `pendingTests` is a `Map`
	of `Set`s, and output chunks are bytes. Plugins must ignore event types and fields they don't know about. Within a
	protocol level, event types and fields can be added but not removed or reshaped.

	Text produced by the test workers, such as logs and the formatted parts of errors, is styled for the terminal when
	the color level (`ProtocolInfo.terminal.stdout.colorLevel`) is above 0, and so may contain ANSI escape codes. It's
	passed on as is, because a reporter that renders to a terminal wants the styling. Plugins that don't, such as one
	producing TAP or output for an agent, should strip it, for example using `stripVTControlCharacters()` from
	`node:util`. At color level 0 there's nothing to strip.

	Every event has a `testFile` (absolute path), except where noted.
	*/
	export type Event = {
		/**
		A test was selected to run, or to be reported as skipped or todo. Declared tests that aren't selected don't get an
		event.
		*/
		readonly type: 'selected-test';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The test's title.
		*/
		readonly title: string;
		/**
		Whether the test was declared with `test.failing()`.
		*/
		readonly knownFailing: boolean;
		/**
		Whether the test was declared with `test.skip()`.
		*/
		readonly skip: boolean;
		/**
		Whether the test was declared with `test.todo()`.
		*/
		readonly todo: boolean;
	} | {
		/**
		A test passed. For known failing tests this means it failed, as expected.
		*/
		readonly type: 'test-passed';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The test's title.
		*/
		readonly title: string;
		/**
		How long the test took, in milliseconds.
		*/
		readonly duration: number;
		/**
		Whether the test was declared with `test.failing()`.
		*/
		readonly knownFailing: boolean;
		/**
		Messages the test logged using `t.log()`. Values that aren't strings are formatted, which may include ANSI styling
		(see `Event`).
		*/
		readonly logs: readonly string[];
	} | {
		/**
		A test failed. For known failing tests this means it passed, which is unexpected.
		*/
		readonly type: 'test-failed';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The test's title.
		*/
		readonly title: string;
		/**
		Why the test failed.
		*/
		readonly err: SerializedError;
		/**
		How long the test took, in milliseconds.
		*/
		readonly duration: number;
		/**
		Whether the test was declared with `test.failing()`.
		*/
		readonly knownFailing: boolean;
		/**
		Messages the test logged using `t.log()`. Values that aren't strings are formatted, which may include ANSI styling
		(see `Event`).
		*/
		readonly logs: readonly string[];
	} | {
		/**
		A hook finished without failing.
		*/
		readonly type: 'hook-finished';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The hook's title.
		*/
		readonly title: string;
		/**
		How long the hook took, in milliseconds.
		*/
		readonly duration: number;
		/**
		Messages the hook logged using `t.log()`. Values that aren't strings are formatted, which may include ANSI styling
		(see `Event`).
		*/
		readonly logs: readonly string[];
	} | {
		/**
		A hook failed.
		*/
		readonly type: 'hook-failed';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The hook's title.
		*/
		readonly title: string;
		/**
		Why the hook failed.
		*/
		readonly err: SerializedError;
		/**
		How long the hook took, in milliseconds.
		*/
		readonly duration: number;
		/**
		Messages the hook logged using `t.log()`. Values that aren't strings are formatted, which may include ANSI styling
		(see `Event`).
		*/
		readonly logs: readonly string[];
	} | {
		/**
		The test file threw an exception that wasn't handled.
		*/
		readonly type: 'uncaught-exception';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The exception.
		*/
		readonly err: SerializedError;
	} | {
		/**
		The test file left a promise rejection unhandled.
		*/
		readonly type: 'unhandled-rejection';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The rejection reason.
		*/
		readonly err: SerializedError;
	} | {
		/**
		The test file didn't import AVA, so no tests could be found in it.
		*/
		readonly type: 'missing-ava-import';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
	} | {
		/**
		The worker called `process.exit()`.
		*/
		readonly type: 'process-exit';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The stack trace at the `process.exit()` call.
		*/
		readonly stack: string;
		/**
		Across all files, not just the one that exited.
		*/
		readonly pendingHooks: PendingHooks;
		/**
		Across all files, not just the one that exited.
		*/
		readonly pendingTests: PendingTests;
	} | {
		/**
		No new tests completed within the timeout. Not file-scoped.
		*/
		readonly type: 'timeout';
		/**
		The period of inactivity, in milliseconds, after which AVA gave up.
		*/
		readonly period: number;
		/**
		Across all files.
		*/
		readonly pendingHooks: PendingHooks;
		/**
		Across all files.
		*/
		readonly pendingTests: PendingTests;
	} | {
		/**
		AVA itself failed.
		*/
		readonly type: 'internal-error';
		/**
		Absolute path of the test file, only if the error happened while that file was being handled.
		*/
		readonly testFile?: string;
		/**
		The error.
		*/
		readonly err: SerializedError;
	} | {
		/**
		The worker failed to run to completion.
		*/
		readonly type: 'worker-failed';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		The worker's non-zero exit code, if that's why it failed.
		*/
		readonly nonZeroExitCode?: number;
		/**
		The signal that terminated the worker, if that's why it failed.
		*/
		readonly signal?: string;
		/**
		The error that crashed the worker, if that's why it failed.
		*/
		readonly err?: SerializedError;
	} | {
		/**
		The worker for a test file exited.
		*/
		readonly type: 'worker-finished';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		Whether AVA terminated the worker, for instance after a timeout, instead of it exiting by itself.
		*/
		readonly forcedExit: boolean;
		/**
		Tests declared in the file.
		*/
		readonly declaredTests: number;
		/**
		Tests that were selected to run but hadn't finished.
		*/
		readonly remainingTests: number;
		/**
		Whether fail fast is enabled for the run, in which case remaining tests are expected once another test failed.
		*/
		readonly failFast: boolean;
	} | {
		/**
		Output written by the worker. `worker-stdout` is its stdout, `worker-stderr` its stderr.
		*/
		readonly type: 'worker-stdout' | 'worker-stderr';
		/**
		Absolute path of the test file.
		*/
		readonly testFile: string;
		/**
		A chunk of output. Chunk boundaries don't necessarily align with characters or lines.
		*/
		readonly chunk: Uint8Array;
	};

	/**
	Counts for the whole run. `failedTests` doesn't include `remainingTests`.
	*/
	export type RunTotals = {
		/**
		The number of test files in the run.
		*/
		readonly files: number;
		/**
		Tests that failed.
		*/
		readonly failedTests: number;
		/**
		Tests that were selected to run but hadn't finished.
		*/
		readonly remainingTests: number;
		/**
		Tests that passed, not counting known failing tests.
		*/
		readonly passedTests: number;
		/**
		Known failing tests that failed, as expected.
		*/
		readonly passedKnownFailingTests: number;
		/**
		Tests declared with `test.skip()`.
		*/
		readonly skippedTests: number;
		/**
		Tests declared with `test.todo()`.
		*/
		readonly todoTests: number;
		/**
		Set when this run is one of several parallel CI jobs that split the test files between them.
		*/
		readonly parallelRuns: {
			/**
			The number of files this job runs.
			*/
			readonly currentFileCount: number;
			/**
			Zero-based index of this job.
			*/
			readonly currentIndex: number;
			/**
			The number of parallel jobs.
			*/
			readonly totalRuns: number;
		} | undefined;
	};

	type MessageBase = {
		/**
		Starts at 0 and increases by one per message, in the order messages are delivered.
		*/
		readonly seq: number;
		/**
		Set on messages AVA waits on: it doesn't continue until every plugin has finished handling them. A message counts
		as handled when the handler asks for the next one (see `observe()`), so this is the point to flush output.
		*/
		readonly sync?: true;
	};

	export type RunMessage = MessageBase & ({
		/**
		A run is starting.
		*/
		readonly type: 'run-start';
		/**
		Identifies the run. Watch mode has many runs per process.
		*/
		readonly runId: number;
		/**
		What reporters need to know about the run up front.
		*/
		readonly plan: RunPlan;
	} | {
		/**
		Something happened during a run.
		*/
		readonly type: 'event';
		/**
		The run the event belongs to.
		*/
		readonly runId: number;
		/**
		What happened.
		*/
		readonly event: Event;
	} | {
		/**
		A run is over. AVA waits for it to be handled, so flush the run's output before asking for the next message.
		*/
		readonly type: 'run-end';
		/**
		The run the message belongs to.
		*/
		readonly runId: number;
		/**
		Why the run ended: it ran to completion, the process was interrupted, or AVA failed to run it.
		*/
		readonly reason: 'completed' | 'interrupted' | 'failed';
		/**
		Counts for the whole run.
		*/
		readonly totals: RunTotals;
		/**
		The exit code AVA suggests the process should end with, based on the run's results.
		*/
		readonly suggestedExitCode: number;
		readonly sync: true;
	} | {
		/**
		The last message. Watch mode produces many runs but a single end of stream. AVA waits for the handler to return,
		so flush everything before that.
		*/
		readonly type: 'end-of-stream';
		readonly sync: true;
	});
}
