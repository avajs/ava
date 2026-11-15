// DRAFT: not exported from any entrypoint yet. See worklog/plugin-protocol.md for lifecycle and ordering notes.
import type {SerializedError} from './state-change-events.js';

export namespace Plugin {
	// Protocols are named after the AVA version they ship in (e.g. `ava-8` for providers). Until the first release
	// that includes this protocol, it is `experimental` and may change without notice.
	export type ProtocolIdentifier = 'experimental';

	/**
	`reporter`: receives run messages and renders them. May claim stdout, in which case a crash aborts the run.
	*/
	export type Capability = 'reporter';

	// --- Plugin-facing API (runs inside the plugin's worker thread) ---

	export type FactoryOptions = {
		/**
		Returns `undefined` if none of the identifiers are supported, in which case AVA fails startup with a compatibility error.
		*/
		negotiateProtocol(supported: readonly [ProtocolIdentifier], options: {version: string}): Protocol | undefined;
		// Add overloads for additional protocols.
	};

	export type Factory<Options = unknown> = (options: FactoryOptions) => Plugin<Options>;

	export type Protocol = {
		readonly ava: {readonly version: string};
		readonly identifier: ProtocolIdentifier;
		readonly projectDir: string;
	};

	export type Plugin<Options = unknown> = {
		readonly capabilities: readonly Capability[];

		/**
		Prefix for this plugin's flags: every flag must be named exactly this or start with `<namespace>-`. Must be a
		lowercase identifier that no other plugin or AVA flag uses.
		*/
		readonly namespace: string;

		/**
		Flags to add to the CLI. Declared before argv is parsed, so these are plain data.
		*/
		readonly flags?: Readonly<Record<string, FlagDefinition>>;

		/**
		 Called once, after config is loaded and argv is parsed. This is where the plugin validates its options and
		 flags, and decides whether it is active for this invocation.
		 */
		configure(context: ConfigureContext<Options>): ConfigureResult | Promise<ConfigureResult>;

		/**
		 Called after the plugin has been subscribed to the run messages (so none are missed). The iterator completes
		 after the `end-of-stream` message. The returned promise should settle once the plugin has flushed everything it
		 intends to write.
		 */
		observe(messages: AsyncIterableIterator<RunMessage>): Promise<void>;
	};

	export type FlagDefinition = {
		readonly type: 'boolean' | 'string' | 'number';
		readonly description: string;
		readonly alias?: string;
	};

	export type ConfigureContext<Options = unknown> = {
		/**
		The plugin's options from configuration, if any. Must be structured-cloneable.
		*/
		readonly options: Options | undefined;
		/**
		Parsed values for the flags declared by this plugin only. Unset flags are `undefined`.
		*/
		readonly flags: Readonly<Record<string, unknown>>;
		readonly mode: {
			readonly watch: boolean;
			readonly debug: boolean;
		};
	};

	export type Diagnostic = {
		readonly level: 'error' | 'warning';
		readonly message: string;
	};

	export type ConfigureResult = {
		/**
		Inactive plugins are shut down and receive no run messages.
		*/
		readonly active: boolean;
		/**
		Any `error` diagnostic aborts startup, replacing today's `exit()` calls in the CLI.
		*/
		readonly diagnostics?: readonly Diagnostic[];
		/**
		 At most one active plugin may claim stdout. While claimed, AVA itself writes nothing to it.
		 */
		readonly claims?: ReadonlyArray<'stdout'>;
	};

	// --- Run messages (host → plugins, over the broadcast channel) ---

	/**
	The serialized subset of the plan emitted by `Api` for each run. Never includes live objects such as `RunStatus`.
	Deliberately limited to what the TAP reporter needs. Fields can be added within a protocol level, but not removed or
	reshaped.
	*/
	export type RunPlan = {
		/**
		Display prefixes for test titles, keyed by the absolute path of the test file (as found in `testFile` on events).
		The host leaves this empty when titles shouldn't be prefixed, which is the case when only one file is run. The
		prefix is the path leading to the test file, shortened for display: the common directory prefix, `__tests__`
		directories, `.test`/`.spec`/`test-` markers and the extension are removed. The last element is the shortened file
		name. Joining the elements and the title, and styling the separator, is up to the reporter.
		*/
		readonly titlePrefixes: ReadonlyMap<string, readonly string[]>;
	};

	/**
	Tests that were started but had not finished, by absolute test file path and then title.
	*/
	export type PendingTests = ReadonlyMap<string, ReadonlySet<string>>;

	/**
	Events are produced by an adapter in the host from AVA's internal state-change events, which are unchanged. Unlike
	those, there are no `stats` snapshots: facts that reporters used to look up in them are on the events that need them.

	Events are structured-cloneable but not JSON-safe: `pendingTests` is a `Map` of `Set`s, and output chunks are bytes.
	Plugins must ignore event types and fields they don't know about. Within a protocol level, event types and fields can
	be added but not removed or reshaped.

	Every event has a `testFile` (absolute path), except where noted.
	*/
	export type Event = {
		readonly type: 'selected-test';
		readonly testFile: string;
		readonly title: string;
		readonly knownFailing: boolean;
		readonly skip: boolean;
		readonly todo: boolean;
	} | {
		readonly type: 'test-passed';
		readonly testFile: string;
		readonly title: string;
		readonly duration: number;
		readonly knownFailing: boolean;
		readonly logs: readonly string[];
	} | {
		readonly type: 'test-failed';
		readonly testFile: string;
		readonly title: string;
		readonly err: SerializedError;
		readonly duration: number;
		readonly knownFailing: boolean;
		readonly logs: readonly string[];
	} | {
		readonly type: 'hook-finished';
		readonly testFile: string;
		readonly title: string;
		readonly duration: number;
		readonly logs: readonly string[];
	} | {
		readonly type: 'hook-failed';
		readonly testFile: string;
		readonly title: string;
		readonly err: SerializedError;
		readonly duration: number;
		readonly logs: readonly string[];
	} | {
		readonly type: 'uncaught-exception';
		readonly testFile: string;
		readonly err: SerializedError;
	} | {
		readonly type: 'unhandled-rejection';
		readonly testFile: string;
		readonly err: SerializedError;
	} | {
		readonly type: 'missing-ava-import';
		readonly testFile: string;
	} | {
		// The worker called `process.exit()`.
		readonly type: 'process-exit';
		readonly testFile: string;
		readonly stack: string;
		/**
		Across all files, not just the one that exited.
		*/
		readonly pendingTests: PendingTests;
	} | {
		// Not file-scoped: no new tests completed in time.
		readonly type: 'timeout';
		readonly period: number;
		readonly pendingTests: PendingTests;
	} | {
		// Only file-scoped if the error happened while a test file was being handled.
		readonly type: 'internal-error';
		readonly testFile?: string;
		readonly err: SerializedError;
	} | {
		readonly type: 'worker-failed';
		readonly testFile: string;
		readonly nonZeroExitCode?: number;
		readonly signal?: string;
		readonly err?: SerializedError;
	} | {
		readonly type: 'worker-finished';
		readonly testFile: string;
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
		Whether `--fail-fast` is enabled for the run, in which case remaining tests are expected once another test failed.
		*/
		readonly failFast: boolean;
	} | {
		readonly type: 'worker-stdout' | 'worker-stderr';
		readonly testFile: string;
		readonly chunk: Uint8Array;
	};

	/**
	Counts for the whole run. `failedTests` doesn't include `remainingTests`.
	*/
	export type RunTotals = {
		readonly files: number;
		readonly failedTests: number;
		readonly remainingTests: number;
		readonly passedTests: number;
		readonly passedKnownFailingTests: number;
		readonly skippedTests: number;
		readonly todoTests: number;
		readonly parallelRuns: {
			readonly currentFileCount: number;
			readonly currentIndex: number;
			readonly totalRuns: number;
		} | undefined;
	};

	type MessageBase = {
		/**
		Starts at 0 and increases by one per message. A gap or repeat is a protocol violation.
		*/
		readonly seq: number;
		/**
		Set on messages that plugins must acknowledge (via the control channel) once they've processed them.
		*/
		readonly sync?: true;
	};

	export type RunMessage = MessageBase & ({
		readonly type: 'run-start';
		readonly runId: number;
		readonly plan: RunPlan;
	} | {
		readonly type: 'event';
		readonly runId: number;
		readonly event: Event;
	} | {
		readonly type: 'run-end';
		readonly runId: number;
		readonly reason: 'completed' | 'interrupted' | 'failed';
		readonly totals: RunTotals;
		readonly suggestedExitCode: number;
		readonly sync: true;
	} | {
		// Always the last message. Watch mode produces many runs but a single end of stream.
		readonly type: 'end-of-stream';
		readonly sync: true;
	});

	// --- Control channel (one MessagePort per plugin, between host and plugin loader) ---

	export type HostMessage = {
		readonly type: 'configure';
		readonly id: number;
		readonly context: ConfigureContext;
	} | {
		// Ask the plugin to stop immediately, e.g. after an acknowledgement timeout.
		readonly type: 'terminate';
	};

	export type PluginMessage = {
		// Sent once the factory has run and the protocol has been negotiated.
		readonly type: 'manifest';
		readonly identifier: ProtocolIdentifier;
		readonly version: string;
		readonly capabilities: readonly Capability[];
		readonly namespace: string;
		readonly flags: Readonly<Record<string, FlagDefinition>>;
	} | {
		readonly type: 'configured';
		readonly id: number;
		readonly result: ConfigureResult;
	} | {
		// Sent by the loader once the plugin is subscribed to the broadcast channel. AVA emits nothing until every active
		// plugin has sent this.
		readonly type: 'ready';
	} | {
		// Sent by the loader after the plugin's iterator has advanced past a message with `sync: true`.
		readonly type: 'ack';
		readonly seq: number;
	} | {
		// An error in `configure()` or `observe()`, or an unhandled rejection in the plugin thread.
		readonly type: 'error';
		readonly id?: number;
		readonly error: {message: string; name: string; stack: string};
	};
}
