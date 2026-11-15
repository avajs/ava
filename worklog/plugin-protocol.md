# Plugin protocol worklog

Working notes for AVA's plugin model, not an official doc. The message and API shapes live in `types/plugin-protocol.d.ts` in the repository. Nothing here is implemented or public yet. The protocol identifier is `experimental` for now.

Plugins will eventually subsume provider managers and shared workers. However the first plugin is the TAP reporter, which stays in `lib/reporters/tap.js` until it moves to its own package. After that we can enable an agent plugin. It's a reporter, not a mere observer: it renders run output and notices for an agent to consume, and it doesn't (yet) control runs.

Only the first iteration is in `types/plugin-protocol.d.ts`. Things that are not in the types yet are marked *future* and collected under [Future direction](#future-direction).

## Configuration

```js
export default {
	plugins: ['@ava/tap', ['some-plugin', {option: true}]],
};
```

Listing a plugin loads it. Whether it's *active* for an invocation is decided by the plugin in `configure()`, typically from its flags. The TAP plugin declares a `--tap` flag and is active when it's set.

## Capabilities

The types only contain the first iteration: the bundled TAP reporter. Everything marked *future* below is not in `types/plugin-protocol.d.ts`; see [Future direction](#future-direction) for the shapes.

A plugin declares the capabilities it opts in to. Each capability adds the data and synchronization points that role needs; plugins pay for nothing else.

| Capability | Purpose | Runs in |
|---|---|---|
| `reporter` | Reads run messages and renders them, may claim stdout. | Plugin thread |
| `observer` (*future*) | Reads run messages, never renders. | Plugin thread |
| `service` (*future*) | Long-lived thread (shared worker complement; starts early). | Service thread |
| `worker` (*future*) | Per-test-file hooks (`provider.worker()` successor). | Test worker |

A plugin is a package with separate entry points per execution site, so each is loaded lazily only where it's needed. The host-side entry runs in a worker thread, owned by an AVA-provided loader (as for shared workers). The loader runs the plugin's factory, bridges the control channel, and manages the subscription.

Only one active plugin can claim stdout, so reporters are mutually exclusive when they do. The agent reporter, like TAP, takes the place of the human-facing default reporter when it's active, and it's activated through its own flag. A reporter doesn't have to claim stdout: one that writes to a file or socket instead can run next to a stdout reporter. Observers are for plugins that never render anything.

## Startup

1. **Load config.** For now only the bundled TAP plugin exists, and the legacy `tap` setting selects it (see Legacy `tap` setting). Reading a `plugins` list is *future*.
2. **Load plugins, negotiate.** The loader runs each factory. The plugin sends a `manifest` (identifier, version, capabilities, flags). Incompatible plugins fail startup with a message like the one providers produce today. Internal feature gating keeps using integer levels, as in `provider-manager.js`.
3. **Parse argv.** Plugin flags are added to yargs and appear in `--help`. Flags are declared separately from `configure()` because argv can't be parsed until they're known. See [Flags](#flags) for naming and collisions.
4. **`configure`.** Plugins receive their options, their own flag values and the run mode (`watch`, `debug`). They return diagnostics, whether they're active and any claims. An `error` diagnostic aborts startup. The TAP plugin uses this for "not available in watch mode" and "not available when debugging". (Terminal characteristics, `ci` and contributions are *future*.)
5. **Resolve claims.** At most one active plugin may claim stdout. If none does, the built-in default reporter is used. While stdout is claimed, AVA itself writes nothing to it. See [Notices](#notices) for where informational messages go.
6. **`ready` (first synchronization point).** Each active plugin's loader subscribes to the broadcast channel and sends `ready`. AVA starts no output and runs nothing until all have. This matters because broadcast channels don't replay messages for late subscribers.

## Notices

Today's informational messages (JSON config ignored, "Using configuration from…", debug timeout disabled, experiments enabled) are `console.log` calls in `lib/cli.js`, so they go to stdout. Only the experiments one is suppressed for `--tap`. Worker stdout and stderr already go to stderr (`stdStream` in `lib/cli.js`), and fatal errors go to stderr via `exit()`.

The plan is to make them structured notices (`{level, code, message, plain}`). `code` is a stable identifier (`experiments-enabled`, `unsupported-config-files`, …) that an agent plugin can act on. Plugin `warning` diagnostics from `configure()` become notices too. Delivering notices to plugins is *future*; in the first iteration the host handles them itself, as described under Who renders.

`message` may contain ANSI styling, as today's output does, so reporters that render to a terminal can use it as is. `plain` is the same text with the styling stripped (the host strips it once, using `stripVTControlCharacters`), for consumers that aren't terminals, like the agent reporter or TAP comments. Providing both avoids every consumer having to remember to strip. When the host itself writes a notice to stderr, it uses `message` if stderr supports color and `plain` otherwise, since the styling is applied using the main process's color settings, which are decided by stdout.

- **Buffering.** Notices produced before `configure` completes, which includes the config-loading ones that print before argv is even parsed, are buffered by the host. If startup fails, the buffer is flushed to stderr, before the error message. Otherwise it's handled once claims are resolved.
- **Who renders.** In the first iteration: if a plugin claims stdout, the host writes notices to stderr. Without a claimant, the built-in default reporter keeps printing them as today. *Future:* a plugin opts in with `receivesNotices` in its `configure()` result. If a stdout-claiming plugin has opted in, it's responsible for rendering notices, otherwise the host still writes them to stderr. Observers that opted in, such as a plugin that writes a results file, get them too, regardless of who renders them.
- **Delivery (*future*).** Notices travel in the broadcast stream as `notice` messages, after `ready` and before the first `run-start`, with `seq` like everything else. They aren't run-scoped.
- **TAP.** The TAP plugin doesn't opt in, so its notices go to stderr. For TAP users this changes the experiments warning from "suppressed" to "shown on stderr". It also fixes the config messages that currently reach stdout ahead of the TAP stream.

## Flags

Naming. The manifest declares a `namespace` (for `@ava/tap`, `tap`). The host checks it's a lowercase identifier, doesn't collide with another plugin's namespace, and doesn't collide with an AVA flag. A plugin flag must be exactly `<namespace>` (the activation flag, so `--tap`) or start with `<namespace>-`. Because `boolean-negation` uses a `no-` prefix, `--no-<namespace>` works without extra handling. Short aliases are only allowed for bundled plugins (keeps `-t` for TAP), via an allowlist that goes away when `@ava/tap` is separated.

Collisions with AVA's own flags are resolved using the protocol identifier, which is named after the AVA version the plugin was written against (while it is `experimental`, there's no such version, so the plugin is treated as current):

- AVA keeps a `since` level for each of its flags, using the same integer levels as `levelsByProtocol` in `provider-manager.js`.
- If the AVA flag existed at the plugin's negotiated level, the plugin could have known about it, so the collision is a fatal startup error. This is the plugin's bug.
- If the AVA flag is newer than the plugin's level, the plugin keeps its flag. The flag is parsed and its value goes to the plugin only. AVA doesn't act on it, as if it didn't exist, and `--help` lists it under the plugin. The host prints a warning naming the plugin, the flag and the AVA version that introduced it, so the user knows the AVA feature is unavailable while that plugin is loaded. This means shipping a new AVA flag can't break a plugin that predates it.
- Two plugins declaring the same flag is a fatal startup error, which should be rare given namespaces.
- Flags are optional sugar. The `plugins` config entry is namespaced by construction and can't collide, so plugin authors should offer every option there too.

Alternative: a reserved dotted qualified form (`--<namespace>.<flag>`) that could never collide. It would be additive (`dot-notation` is off in `lib/cli.js`, so it would be a literal flag name), so it can wait until a collision happens. However this would not resolve activation flag collisions.

## Run messages

The host posts `RunMessage`s on a `BroadcastChannel` whose name is random per process. It's passed to plugin threads through `workerData` and never to test workers, which share the process when `workerThreads` is enabled.

- Every message has a `seq`. The loader checks it; a gap is a protocol violation, reported as an error.
- A run is `run-start` (with a serialized `RunPlan`), any number of `event` messages, then `run-end` (with `RunTotals` and the suggested exit code). Everything is tagged with a `runId`, so watch mode (multiple runs per process) works without a second protocol.
- `end-of-stream` is last, once per process.
- Messages are structured-cloned. `pendingTests` on `timeout` and `process-exit` is a `Map` of `Set`s, and output chunks are bytes, so events aren't JSON-safe. We decided not to require that: a plugin that wants JSON has to convert.
- Plugins read messages through an async iterator and never see the channel. Their reporter no longer reads `plan.status.stats`; it gets the totals from `run-end` and per-file facts from `worker-finished`.

## Plan

`RunPlan` carries only what the TAP reporter needs: `titlePrefixes`. It's a lookup from test file to its display-shortened path segments, computed by the host (using the logic in `lib/reporters/prefix-title.js`, refactored to return the segments), and left empty when titles shouldn't be prefixed, i.e. when there's a single file. So plugins don't need `files`, `extensions` or `filePathPrefix`, don't reimplement AVA's shortening rules and don't decide when to prefix. A plugin looks up `titlePrefixes.get(testFile) ?? []`, then joins and styles the result. Relative file names for messages come from `testFile` and the protocol's `projectDir`.

`failFastEnabled` used to be on the plan, it's now the `failFast` marker on `worker-finished` (see Events).

Adding a field within a protocol level is cheap and non-breaking, so anything else waits until a plugin needs it. Removing or reshaping a field needs a new protocol level and a shim.

## Events

Today's events are `StateChangeEvent`s, emitted by `RunStatus` (`lib/run-status.js`). Each worker event gets `testFile` assigned in `lib/fork.js`, and a few host events (`timeout`, `interrupt`, `end`, `shared-worker-error`) don't have one. The type file `types/state-change-events.d.ts` is incomplete: it lacks `hook-failed`, `hook-finished`, `internal-error`, `missing-ava-import`, `process-exit`, `uncaught-exception`, `unhandled-rejection`, `shared-worker-error` and `interrupt`, and it has `nonZeroExitCode` as a boolean when it's an exit code. Its `parallelRuns` also lacks `currentFileCount`. None of that is touched.

Instead, the host runs an adapter that maps the internal events to a separate vocabulary (`Plugin.Event`). That adapter is also where shims for later protocol levels will live. Internal events and the worker-to-host IPC stay as they are, so the in-process reporters keep working untouched. Principles:

- **No `stats` snapshots.** `RunStatus` emits a `stats` event with a deep copy of all per-file counters (`byFile` is a `Map` of every file) before almost every event. Over the channel that would be O(files) per message. Reporters only used it for two things, which are now carried directly:
  - `worker-finished` has `declaredTests`, `remainingTests` and a `failFast` marker (TAP used `byFile` for the first two). With `failFast` set, remaining tests are expected once another test failed, and reporters decide what to do with that. This replaces `failFastEnabled` on the plan.
  - `run-end` has `RunTotals` (TAP used the totals and `parallelRuns` in `endRun()`).
- **Only what TAP handles for now.** `selected-test`, `test-passed`, `test-failed`, `hook-finished`, `hook-failed`, `uncaught-exception`, `unhandled-rejection`, `missing-ava-import`, `process-exit`, `timeout`, `internal-error`, `worker-failed`, `worker-finished`, `worker-stdout` and `worker-stderr`. The default reporter also handles `interrupt` (covered by `run-end` with reason `interrupted`, but its `pendingTests` isn't carried yet), `line-number-selection-error` and `shared-worker-error`, and reads snapshot counts from `stats`. `declared-test`, `test-register-log-reference`, `starting`, `touched-files` and `accessed-snapshots` are internal. All of that can be added later.
- **`pendingTestsLogs` is left out.** TAP doesn't use it. It's how `RunStatus` attaches logs for pending tests to `timeout`/`process-exit`/`interrupt`.
- **`end` is gone.** `run-end` replaces it.
- **Forward compatibility.** Plugins must ignore event types and fields they don't know. Within a protocol level types and fields are only added.
- **Scoping.** Every event has `testFile`, except `timeout` and, in some cases, `internal-error`.

## Acknowledgements and flush

The broadcast channel is one-way and unordered relative to other channels, so acknowledgements travel on a per-plugin control `MessagePort`, and the point of acknowledgement is in-band:

- Messages with `sync: true` (`run-end`, `end-of-stream`) must be acknowledged with `{type: 'ack', seq}`.
- The loader sends the ack once the plugin's iterator has *advanced past* that message, i.e. the plugin has finished handling it.
- Before exiting, including on the interrupt path that currently calls `reporter.endRun()` then `process.exit(1)`, the host posts `run-end` and `end-of-stream` and waits for all acks, with a timeout. On timeout, it sends `terminate` and proceeds.

This is the final synchronization point: AVA doesn't exit before reporters have flushed.

## Failure policy

- A plugin that claims stdout is critical: if its thread crashes or its `observe()` rejects, the run aborts.
- Other plugins are non-critical: the failure surfaces as an event (modelled on `shared-worker-error`, which would need a counterpart in `run-status.js`) and the run continues.
- Ordering violations and protocol errors are treated like crashes.
- Fatal startup errors (an `error` diagnostic, an incompatible plugin, a flag collision) are a plain crash: buffered notices and the error message go to stderr and the process exits non-zero, as `exit()` does today. No plugin streams exist at that point and none are set up for it. A caller such as an agent is expected to check stderr and the exit code, as it would for any crashed process.

## Legacy `tap` setting

For now the change must not be noticeable, so `--tap`, `-t` and `tap: true` in config all keep working exactly as they do, with no deprecation notice. The host maps them implicitly onto the bundled TAP plugin, as if `plugins: ['@ava/tap']` had been configured.

- **Flag and alias.** The plugin declares `--tap`, and its alias `-t` is allowed by the bundled-plugin exemption (see Flags).
- **Config.** The `tap` config key is passed to the implicit plugin as its options, `{tap: boolean}`. The plugin decides activation from `flags.tap ?? options.tap`, which keeps today's `combined.tap` behavior.
- **Mode quirks are preserved.** Today `--tap` with watch or debug is an error unless config also sets `tap` (`lib/cli.js`, around lines 289 and 303), and in that case the default reporter is used silently. The plugin reproduces this: it errors if `flags.tap` is set in watch or debug mode without `options.tap`, and it's inactive in those modes in any case.
- **No cost when inactive.** Bundled plugins have a static manifest known to the host (flags, namespace, capabilities), so argv can be parsed without starting anything, and a plugin thread is only started if the plugin turns out to be active. Which means no extra thread on non-TAP runs.

## Timeouts

Internal constants, not configurable for now:

| What | Timeout | If it expires |
|---|---|---|
| Startup per plugin: spawn, import, `negotiate`, `configure`, `ready` | 10s, in parallel across plugins | Fatal startup error naming the plugin, handled like any startup crash (stderr, non-zero exit). |
| Flush at normal end (`run-end` and `end-of-stream` acks) | 10s | Warn on stderr, send `terminate`, exit with the run's usual exit code. |
| Flush on interrupt | 2s | Same, but faster. |

- Startup matches the default test timeout (`10s` in `lib/cli.js`). It is parallel, so the total is the slowest plugin, not the sum.
- Normal-end flush needs headroom because a consumer may be reading a pipe slowly, but still needs a cap so exit can't hang on a stuck plugin.
- Interrupt is short because the user wants out. Today the interrupt path exits straight after `reporter.endRun()`.
- A flush timeout keeps the computed exit code. The test results are already determined, and a lost report shouldn't turn a pass into a failure.
- `ava debug` disables these timeouts, like it already does for the test timeout (`lib/cli.js`), so plugins can be stepped through.
- No heartbeat. A crashed plugin thread is detected from its `error` and `exit` events. A plugin stuck in a loop mid-run only surfaces at the flush timeout.

## Future direction

Removed from `types/plugin-protocol.d.ts` because the first iteration (the bundled TAP reporter) doesn't use them. Roughly how they were modelled:

```ts
// Capabilities beyond `reporter`.
type Capability = 'observer' | 'reporter' | 'service' | 'worker';
// `observer`: receives run messages, never renders. `service`: long-lived thread (shared worker successor).
// `worker`: entry loaded in each test worker (`provider.worker()` successor).
// `observe()` is only called for `observer` and `reporter` plugins.

// A plugin as listed in a `plugins` configuration entry, optionally with options.
type Specifier = string | readonly [specifier: string, options: unknown];

type FlagDefinition = {/* … */ readonly array?: boolean}; // Repeatable flag, received as an array.

type ConfigureContext = {
	/* … */
	readonly mode: {/* … */ readonly ci: boolean};
	// Terminal characteristics of the main process, which can't be reliably detected in a worker thread.
	readonly terminal: {
		readonly stdoutIsTTY: boolean;
		readonly stderrIsTTY: boolean;
		readonly columns: number | undefined;
		readonly colorLevel: 0 | 1 | 2 | 3;
	};
};

type ConfigureResult = {
	/* … */
	// Opt in to `notice` messages. A stdout-claiming plugin that opts in renders them, otherwise AVA writes them to stderr.
	readonly receivesNotices?: boolean;
	readonly contributions?: Contributions;
};

type Contributions = {
	readonly extensions?: readonly string[];
	readonly nodeArguments?: readonly string[];
	readonly serviceEntry?: string; // Requires `service`. Module URL, loaded in the plugin's service thread.
	readonly workerEntry?: string; // Requires `worker`. Module URL, loaded in each test worker.
	// Extension point: globs, require hooks.
};

type Notice = {
	readonly level: 'info' | 'warning';
	readonly code: string; // Stable identifier, e.g. `experiments-enabled`.
	readonly message: string; // May contain ANSI styling.
	readonly plain: string; // The same, without ANSI styling.
};

// Added to `RunMessage`: not run-scoped, sent after `ready` and before the first `run-start`, only to opted-in plugins.
type NoticeMessage = {readonly type: 'notice'; readonly notice: Notice};
```

Also future:

- **Control.** A `controller` capability (trigger runs, abort, filter) for the agent reporter after the first version, which only reports. `runId` and the multi-run lifecycle are there for it already.
- **Default reporter as a plugin.** It would add to the protocol:
  - Plan fields `bailWithoutReporting`, `matching`, `previousFailures`, `firstRun`, `emptyParallelRun` and `selectionInsights` (from `plan.status`; check that `selectionInsights` is structured-cloneable).
  - The `interrupt`, `line-number-selection-error` and `shared-worker-error` events, plus `pendingTests` on interrupt, and snapshot counts in `RunTotals`.
  - A host rule for when to prefix titles that knows about watch mode (the default reporter prefixes in watch mode even for a single file).
- **In-process plugins.** A main-thread transport would implement the same async iterator and control channel.
