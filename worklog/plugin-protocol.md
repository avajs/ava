# Plugin protocol worklog

Working notes for AVA's plugin model, not an official doc. The message and API shapes live in `types/plugin-protocol.d.ts` in the repository. The first iteration is implemented internally; there are no public plugin exports or third-party plugin configuration yet. The protocol identifier is `experimental` for now.

Plugins will eventually subsume provider managers and shared workers. However the first plugin is the TAP reporter. Its renderer stays in `lib/reporters/tap.js` until it moves to its own package; the default-exported factory is in `lib/plugin-support/tap-plugin.js`. Keeping that thin entry separate preserves the existing class-based reporter tests. After that we can enable an agent plugin. It's a reporter, not a mere observer: it renders run output and notices for an agent to consume, and it doesn't (yet) control runs.

The host and AVA-owned worker loader are `lib/plugin-support/reporter-host.js` and `lib/plugin-support/reporter-loader.js`. `lib/plugin-support/run-messages.js` adapts internal run plans, events and totals. New runtime, adapter and CLI tests live under `test/reporter-plugins/` and run with `pnpm exec test-ava`; the existing reporter tests are unchanged.

Only the first iteration is in `types/plugin-protocol.d.ts`. Things that are not in the types yet are marked *future* and collected under [Future direction](#future-direction).

## Configuration

There are two ways a plugin gets configured. Which one applies depends on whether AVA bundles the plugin:

```js
export default {
	// Bundled plugin (AVA ships it): a top-level key named after the plugin's namespace.
	tap: true,

	// Any other plugin (future): listed in `plugins`.
	plugins: [['some-plugin', {option: true}]],
};
```

Bundled plugins are never listed in `plugins`, even if the code lives in a separate package that AVA depends on. AVA ships a static table of them. This is the same shape as the `typescript` key and `@ava/typescript` today. The only bundled plugin is TAP, and it'll be unbundled in the next major release (see [Unbundling TAP](#unbundling-tap)). An agent reporter (`@ava/agent`) would be bundled the same way.

The table is deliberately thin: for each plugin its namespace and module location (eventually a package name), nothing about its flags. The activation flag is implied by the namespace (`--<namespace>`, and so `--no-<namespace>`), and is the only flag AVA knows without loading the plugin. The one exception is TAP's legacy `-t` alias, which exists only while TAP is bundled. AVA retains the activation flag's help text for invocations where the plugin is not loaded. Everything else, including any flags the plugin adds later, comes from the plugin's own `negotiate` message, so a plugin can evolve without a new AVA release. This is what lets a bundled plugin eventually be a peer dependency of `ava` with a semver major range: AVA ships declaring compatibility, and users who install the plugin themselves get newer minor releases (new flags, new options) without AVA being republished. Compatibility is the protocol's job, not the table's.

- **Selection.** A bundled plugin is selected when its activation value is truthy after CLI overrides (`flags.tap ?? config.tap`), or when any `--<namespace>-*` flag (including its negated form) requires its declarations. `tap: false` and `--no-tap` alone do not load TAP; `--no-tap` also overrides `tap: true`, and repeated activation flags use the last value. Flags after `--` are not considered. The namespaced-option exception matters because the plugin's other flags aren't in the table: without it, `--agent-verbose` would be an unknown option. Selection only decides whether to load the plugin. Detecting it needs a lenient first pass over argv (see [Startup](#startup)).
- **Loading.** The module is only loaded when the plugin is selected. TAP currently uses an AVA-relative module URL. A future bundled package will be resolved from where AVA itself is installed, which is where a peer dependency lands, whether or not the user installed it at the top level; a missing package should produce an installation instruction. Version and reset-cache invocations do not need plugin startup.
- **Options.** The value of the top-level key is passed to the plugin as its `options`.
- **Activation.** Selection isn't activation. The plugin is loaded and treated like any other plugin, so it decides in `configure()` whether it's active for this invocation (typically from its flags and options, so `--agent` or `--no-agent` is only a hint to load it).
- **Validation.** The `negotiate` message is checked against the table only for the namespace, which must match. The plugin must also declare the activation flag as a boolean, since AVA parses it before the plugin's flags are known. A mismatch is a startup error. Its other flags and capabilities aren't validated against anything, other than by the normal [Flags](#flags) rules.
- **Namespaces.** Plugins that aren't bundled can't use a namespace from the table.

Whether a selected plugin is *active* for an invocation is decided by the plugin in `configure()`, typically from its flags. The TAP plugin declares a `--tap` flag and is active when it's set.

## Capabilities

The types only contain the first iteration: the bundled TAP reporter. Everything marked *future* below is not in `types/plugin-protocol.d.ts`; see [Future direction](#future-direction) for the shapes.

A plugin declares the capabilities it opts in to. Each capability adds the data and synchronization points that role needs; plugins pay for nothing else.

| Capability | Purpose | Runs in |
|---|---|---|
| `reporter` | Reads run messages and renders them, may claim stdout. | Plugin thread |
| `observer` (*future*) | Reads run messages, never renders. | Plugin thread |
| `service` (*future*) | Serves test workers from the plugin's own long-lived thread (e.g. a warmed-up testcontainer); shared worker successor. | Plugin thread |
| `worker` (*future*) | Per-test-file hooks (`provider.worker()` successor). | Test worker |

A plugin runs in a worker thread owned by an AVA-provided loader (as for shared workers). The `cli` module loads the plugins, since it needs them for argument parsing. The loader runs the plugin's entry point, bridges the control channel (a `MessagePort` per plugin, typed in `types/plugin-control-channel.d.ts`, which is internal to AVA and kept apart from the plugin author types), and manages the subscription. This covers `reporter`, `observer` and `service`, which all live in the plugin's thread.

Only one active plugin can claim stdout, so reporters are mutually exclusive when they do. The agent reporter, like TAP, takes the place of the human-facing default reporter when it's active, and it's activated through its own flag. A reporter doesn't have to claim stdout: one that writes to a file or socket instead can run next to a stdout reporter. Observers are for plugins that never render anything.

## Startup

A plugin's entry point is a function that receives `negotiateProtocol()`. It calls it with the plugin (its version, capabilities, namespace, flags and `configure()`), and `await`s the result. That one call covers the whole startup handshake as far as the plugin is concerned.

1. **Load config.** Bundled plugins can be selected by their enabled top-level key (for now only `tap`), subject to CLI overrides. Reading a `plugins` list for other plugins is *future*.
2. **Select, load plugins, negotiate.** Argv is parsed leniently first (unknown flags allowed) to find the bundled plugins selected by their effective activation value or a `--<namespace>-*` flag. False config and negated activation alone do not select a plugin. This pass is only for selection and establishing terminal color; flags are parsed again for configuration. The loader then runs each selected plugin's entry point. The plugin calls `negotiateProtocol(supported, plugin)`, which sends a `negotiate` message (supported identifiers, version, capabilities, namespace, flags) to the host. The host picks the first identifier it knows. If there is none, startup fails with a message like the one providers produce today. Internal feature gating keeps using integer levels, as in `provider-manager.js`.
3. **Parse argv.** Plugin flags are added to yargs and appear in `--help`, and argv is parsed for real. A `--<namespace>-*` flag that no loaded plugin declares is an unknown option as usual. Flags are part of the `negotiate` message, not `configure()`, because argv can't be parsed until they're known. See [Flags](#flags) for naming and collisions.
4. **`configure`.** The host sends the plugin's `configure()` a `ConfigureContext`: what the plugin knows about AVA (`ava`, `identifier`, `projectDir`, `terminal`), its options, its own flag values and the run mode (`watch`, `debug`). It returns diagnostics, whether the plugin is active and any claims. An `error` diagnostic aborts startup. The TAP plugin uses this for "not available in watch mode" and "not available when debugging". (`ci` and contributions are *future*.)
5. **Resolve claims.** At most one active plugin may claim stdout. If none does, the built-in default reporter is used. While stdout is claimed, AVA itself writes nothing to it. See [Notices](#notices) for where informational messages go.
6. **`negotiateProtocol()` settles.** Once all configurations and claims have been validated, the host sends an internal `activate` control message to each active plugin. Its negotiation resolves with the `Protocol` (`ava`, `identifier`, `projectDir`, `terminal` and `observe()`), so plugins never check for inactivity. The extra control message prevents a plugin from starting output before conflicting claims or another plugin's configuration error are known. Otherwise negotiation rejects, and plugins must not handle that: it's what ends the plugin, and cleanup belongs in `finally`. There are two kinds of rejection, which the loader tells apart because it creates them:
   - **Inactive.** `configure()` returned `active: false`. The loader ends the plugin quietly and shuts down its thread. Nothing is reported.
   - **Startup failure.** No supported identifier, an `error` diagnostic and so on. AVA reports a fatal startup error. This follows shared workers, where an unsupported protocol makes `negotiateProtocol()` throw and the loader then rethrows on the next tick, crashing the thread. The host picks that up from the thread's `error` event (`waitForError` in `lib/plugin-support/shared-workers.js`). The plugin loader does the same.

   If a plugin swallows the rejection anyway, it has no protocol and fails on first use, which is a crash like any other.

   For inactivity, the host first records the configure result and sends an internal `deactivate` message before the loader rejects negotiation. This avoids mistaking an inactive thread's fast exit for a startup crash. The host allows `finally` cleanup to finish, within the startup deadline, rather than immediately terminating the thread.

   Host-side startup failures (incompatible protocols, invalid declarations, conflicting claims or error diagnostics) use an internal `reject` message so pending negotiation rejects in the plugin too. Shutdown gives its cleanup the remainder of the startup deadline before forcing termination.
7. **`ready` (first synchronization point).** The plugin calls `protocol.observe(handler)`. The loader subscribes to the broadcast channel, sends `ready` and calls `handler` with an iterator of run messages. AVA starts no output and runs nothing until every active plugin has. This matters because broadcast channels don't replay messages for late subscribers, and it means plugins that need to prepare something first (open a file, say) can do so before calling `observe()`. A plugin that never calls it is caught by the startup timeout.

### Capabilities and protocol typing

There's one negotiation per plugin, regardless of its capabilities. The types follow `Plugin.capabilities`, though: `negotiateProtocol()` resolves with `Protocol<Capabilities>`, which only has the parts for the declared capabilities (`observe()` needs `reporter`), and `ConfigureResult.claims` is only allowed for `reporter` plugins. `configure()`'s result uses `NoInfer` so the capability list is inferred from `capabilities` alone, and object literals returned from `configure()` keep their literal types (`claims: ['stdout']` without `as const`). This is type-level only, so the wire protocol is unaffected, and the host still validates at runtime (claims without `reporter` is a startup error).

This matters because capabilities determine what a plugin is expected to do, and those differ. A `service` plugin, say one that provides a warmed-up testcontainer to test workers, isn't expected to call `observe()`, so it shouldn't have access to it: `Protocol<'service'>` has no `observe()`, while `Protocol<'reporter' | 'service'>` has both.

A `service` plugin (*future*) is the plugin's own long-lived thread serving test workers, so it shares the thread with any `reporter` capability of the same plugin. Both come from the same `negotiateProtocol()` call, which is where the capability-typed `Protocol` pays off. The `ready` synchronization point becomes capability-specific: it's sent once the plugin has called what its capabilities require. That's `observe()` for a reporter, and for a service whatever signals that it's warmed up and test workers can connect (shared workers' `ready()` is the precedent). AVA doesn't start test workers until every active plugin is ready. The shape of the service protocol (publishing to and subscribing from test workers, as shared workers do) isn't settled.

### Why `configure()` isn't on the protocol

`configure()` is passed in with the plugin, and called by the host before `negotiateProtocol()` resolves, so there's no window in which a plugin has a protocol but doesn't know whether it's active. Parts of the protocol that only make sense for an active plugin, like `observe()`, are not available to `configure()`: it gets a `ConfigureContext` instead, which is the view of the protocol before activation. They share `ProtocolInfo` (`ava`, `identifier`, `projectDir`). Start small: the context only gets more fields when a plugin needs them (a future provider-like plugin may need `findFiles()`, for instance), and fields can be added within a protocol level.

### Why `observe()` takes a handler

Shared workers return an async iterator from `subscribe()`. On its own, that has two problems for this protocol: the host can't tell when a plugin is done with it (an iterator can be abandoned with `break`, or just never pulled), and a plugin can acquire it at any time. A single per-message callback would fix that but makes plugins keep their own loop state between calls. So `observe(async messages => { for await (const message of messages) … })` gives the plugin the iterator, scoped to a handler:

- The handler's lifetime is the plugin's observation period. When it settles, the host knows that handler is done: it stops waiting for acks from it and stops sending.
- Flushing after the loop (`await flush()`) naturally belongs in the handler, and the ack for `end-of-stream` is sent when the handler returns.
- Other `sync: true` messages (`run-end`) are acknowledged when the plugin requests the next message, i.e. after the loop body has finished with them.
- An early `return` or `break` out of the handler isn't an error, but that handler gets no more messages.
- `observe()` can be called more than once, e.g. by a plugin that both renders and writes a results file, or by a library the plugin uses. Each call gets its own iterator, and the loader fans messages out to all of them. A message is acknowledged once every handler that's still running has finished with it. There's no replay, so a handler only sees messages delivered after its call, which in practice means calling `observe()` in the same turn as the first call if it needs everything. The first call sends `ready`.

If every handler returns early, the loader remains subscribed until `end-of-stream`, acknowledging synchronization messages without delivering them to finished handlers.

## Terminal and color

A plugin's worker thread can't detect color support or terminal size itself: its `process.stdout` is a pipe to the main thread, without `isTTY` or `columns`, so a plugin's own chalk would end up at level 0. AVA decides in the main process (`lib/cli.js`: `--no-color` gives level 0, otherwise chalk's `supportsColor.level`, which accounts for `--color`, `FORCE_COLOR`, `NO_COLOR` and the TTY), and already passes the result to test workers as `chalkOptions` for `setChalk()`. Plugins get the same treatment:

- **`ProtocolInfo.terminal`.** Available to both `configure()` and the active protocol, since it's a fixed fact about the process. First iteration: `terminal.stdout.colorLevel`, on chalk's scale (0 to 3). TAP needs it because `prefix-title.js` styles the title separator with `chalk.gray.dim`, so TAP output has ANSI in it today when color is forced. A plugin would use it as `new Chalk({level})`.
- **Environment.** The host also starts plugin threads with `FORCE_COLOR` set to the decided level (`0` included, which also covers `--no-color`), so libraries that autodetect color (chalk, kleur, picocolors) agree with AVA without the plugin reading the info.
- **Static for now.** The color level, the only field in the first iteration, doesn't change while AVA runs. Width is the part that does, see below.
- **Future.** `isTTY` and `columns` for stdout, and the same for stderr including its own color level (stderr support is detected separately by chalk, as `supportsColorStderr`), are needed by the default reporter (code excerpt width, watch mode) and by anything that renders notices on stderr itself. See Future direction.
- **Future: dynamic columns.** Once `columns` is handled it's dynamic, so it's exposed live instead of as a startup snapshot. The host allocates a single `SharedArrayBuffer` for the process, shared with every plugin thread (passed in `workerData`, like the broadcast channel name), and updates it with `Atomics.store()` and `Atomics.notify()` when the main process's `stdout` or `stderr` emits `resize` (only emitted for TTYs). One write by the host reaches all plugin threads, with no per-thread allocation or bookkeeping. In the plugin thread, `ProtocolInfo.terminal.stdout.columns` is a getter that does an `Atomics.load()`. It stays `readonly` in the type, which only means plugins can't assign to it, not that the value is constant. The doc comment should say it can change and should be read when needed.
  - Reads are synchronous, so a reporter gets the width at render time, which is what it wants, without keeping state from a message stream.
  - There's nothing to coalesce, since only the latest value is stored. It's always current, so there's no gap between negotiation and `ready` to handle.
  - It's available to every capability, including a service-only plugin with no message stream, and to `configure()`.
  - Not ordered with run messages. For rendering that's fine, as the current width is what matters.
  - A plugin that needs to re-render on change uses `onResize(listener)`, which returns a `Disposable` to stop listening, using the explicit resource management API (`using`, `Symbol.dispose`). There's no plain-function alternative. AVA supports Node.js 22.20 and up, and Node.js 22 has `Symbol.dispose` but not the `using` syntax, so plugins running there have to call `[Symbol.dispose]()` themselves. The buffer itself is never exposed to plugin code: the loader owns it, and implements `onResize()` by waiting on it with `Atomics.waitAsync()`, only while there are listeners. Waking on a notification and comparing with the last seen value means rapid resizes coalesce. To check when building this: that a pending `Atomics.waitAsync()` doesn't keep the plugin thread alive, and otherwise how to scope it to the plugin's lifetime.
  - The buffer is a small `Int32Array` with a slot per stream (stdout columns, stderr columns). `undefined` (not a TTY, no width) is encoded as a sentinel such as `0`. `isTTY` and the color level don't change, so they stay plain values.
  - Unlike the broadcast channel, which is kept from test workers so they can't listen in, there's no reason to hide the buffer from them: it only holds the terminal width. Test workers could be given it too, if they ever need it. It's just not handed to plugin code. Plugin code could still get at it through `workerData`, but plugins are trusted code and the worst case is a wrong width.
  - An in-process transport would give plugins a plain getter on the same type.
  - We considered propagating changes as `terminal` messages in the run message stream. That's ordered, and acked like the rest, but needs coalescing, a catch-up message after `ready`, and doesn't reach plugins without a stream.

Output ordering is a separate matter. A plugin writes through its worker's `process.stdout`, which the main thread forwards, so ordering relative to the main thread's own writes isn't defined. That is why startup has the `claims` and notice rules: a stdout claimant is the only writer to stdout.

## Notices

Today's informational messages (JSON config ignored, "Using configuration from…", debug timeout disabled, experiments enabled) are `console.log` calls in `lib/cli.js`, so they go to stdout. Only the experiments one is suppressed for `--tap`. Worker stdout and stderr already go to stderr (`stdStream` in `lib/cli.js`), and fatal errors go to stderr via `exit()`.

The plan is to make them structured notices (`{level, code, message}`). `code` is a stable identifier (`experiments-enabled`, `unsupported-config-files`, …) that an agent plugin can act on. Plugin `warning` diagnostics from `configure()` become notices too. Delivering notices to plugins is *future*; in the first iteration the host handles them itself, as described under Who renders.

`message` may contain ANSI styling, as today's output does, so reporters that render to a terminal can use it as is. As with event text (see [Events](#events)), plugins that don't render to a terminal, like the agent reporter or TAP comments, strip it themselves using `stripVTControlCharacters()`. There's no separate `plain` version. When the host itself writes a notice to stderr, it strips the styling if stderr doesn't support color, since the styling is applied using the main process's color settings, which are decided by stdout.

- **Buffering.** Notices produced before `configure` completes, which includes the config-loading ones that print before argv is even parsed, are buffered by the host. If startup fails, the buffer is flushed to stderr, before the error message. Otherwise it's handled once claims are resolved.
- **Who renders.** In the first iteration: if a plugin claims stdout, the host writes notices to stderr. Without a claimant, the built-in default reporter keeps printing them as today. *Future:* a plugin opts in with `receivesNotices` in its `configure()` result. If a stdout-claiming plugin has opted in, it's responsible for rendering notices, otherwise the host still writes them to stderr. Observers that opted in, such as a plugin that writes a results file, get them too, regardless of who renders them.
- **Delivery (*future*).** Notices travel in the broadcast stream as `notice` messages, after `ready` and before the first `run-start`, with `seq` like everything else. They aren't run-scoped.
- **TAP.** The TAP plugin doesn't opt in, so its notices go to stderr. For TAP users this changes the experiments warning from "suppressed" to "shown on stderr". It also fixes the config messages that currently reach stdout ahead of the TAP stream.

## Flags

Naming. The plugin declares a `namespace` (for `@ava/tap`, `tap`). The host checks it's a lowercase identifier, doesn't collide with another plugin's namespace, and doesn't collide with an AVA flag. A plugin flag must be exactly `<namespace>` (the activation flag, so `--tap`) or start with `<namespace>-`. Because `boolean-negation` uses a `no-` prefix, `--no-<namespace>` works without extra handling. Plugins can't declare short aliases. The only one is `-t` for TAP, which comes from the static table and goes away when TAP is unbundled.

Collisions with AVA's own flags are resolved using the protocol identifier, which is named after the AVA version the plugin was written against (while it is `experimental`, there's no such version, so the plugin is treated as current):

- AVA keeps a `since` level for each of its flags, using the same integer levels as `levelsByProtocol` in `provider-manager.js`.
- If the AVA flag existed at the plugin's negotiated level, the plugin could have known about it, so the collision is a fatal startup error. This is the plugin's bug.
- If the AVA flag is newer than the plugin's level, the plugin keeps its flag. The flag is parsed and its value goes to the plugin only. AVA doesn't act on it, as if it didn't exist, and `--help` lists it under the plugin. The host prints a warning naming the plugin, the flag and the AVA version that introduced it, so the user knows the AVA feature is unavailable while that plugin is loaded. This means shipping a new AVA flag can't break a plugin that predates it.
- Two plugins declaring the same flag is a fatal startup error, which should be rare given namespaces.
- Flags are optional sugar. Plugin options in configuration (the top-level key for bundled plugins, the `plugins` entry for others) are namespaced by construction and can't collide, so plugin authors should offer every option there too.

Alternative: a reserved dotted qualified form (`--<namespace>.<flag>`) that could never collide. It would be additive (`dot-notation` is off in `lib/cli.js`, so it would be a literal flag name), so it can wait until a collision happens. However this would not resolve activation flag collisions.

## Run messages

The host posts `RunMessage`s on a `BroadcastChannel` whose name is random per process. It's passed to plugin threads through `workerData` and never to test workers, which share the process when `workerThreads` is enabled.

- Every message has a `seq`. The loader checks it; a gap is a protocol violation, reported as an error.
- A run is `run-start` (with a serialized `RunPlan`), any number of `event` messages, then `run-end` (with `RunTotals` and the suggested exit code). Everything is tagged with a `runId`, so watch mode (multiple runs per process) works without a second protocol.
- `end-of-stream` is last, once per process.
- Messages are structured-cloned. `pendingTests` on `timeout` and `process-exit` is a `Map` of `Set`s, and output chunks are bytes, so events aren't JSON-safe. We decided not to require that: a plugin that wants JSON has to convert.
- Plugins receive messages through `protocol.observe()` and never see the channel. Their reporter no longer reads `plan.status.stats`; it gets the totals from `run-end` and per-file facts from `worker-finished`.

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
- **ANSI in event text.** Text from the test workers (`logs`, the formatted parts of `err`, such as `formattedDetails`) is styled by the workers' chalk, which is at the same color level as `terminal.stdout.colorLevel` (`chalkOptions`), and `t.log()` formats non-string values with concordance's themed output. Events carry it as is, and so do notices (see [Notices](#notices)). We considered carrying a `plain` version next to it and decided against it:
  - `err` is a deep structure (`formattedCause`, `formattedDetails`, nested `errors`), so doubling every styled string means a parallel structure or a wrapper type on all of them. Logs alone would be `{text, plain}` pairs, and they'd be sent to every plugin including those that render color.
  - Stripping is one call to Node's `stripVTControlCharacters()`, which the TAP reporter already uses for titles and errors. It's a no-op at color level 0. Note that TAP doesn't strip logs today (`supertap` only strips the title, not comments), so with forced color its `t.log()` output contains ANSI. Stripping them in the plugin is a small behavior change, which is worth making, as TAP output shouldn't contain escape codes.
  - Notices follow the same rule, for consistency. They used to have a `plain` field because they're a single host-produced string, but one rule is easier to remember than two.

  If plugins turn out to get this wrong in practice, the host could strip for plugins that opt out of styling, with a `configure()` result flag, and only then would a `plain`-style field be worth the cost.
- **Forward compatibility.** Plugins must ignore event types and fields they don't know. Within a protocol level types and fields are only added.
- **Scoping.** Every event has `testFile`, except `timeout` and, in some cases, `internal-error`.

## Acknowledgements and flush

The broadcast channel is one-way and unordered relative to other channels, so acknowledgements travel on a per-plugin control `MessagePort`, and the point of acknowledgement is in-band:

- Messages with `sync: true` (`run-end`, `end-of-stream`) must be acknowledged with `{type: 'ack', seq}`.
- The loader sends the ack once every `observe()` handler that's still running has finished handling that message: when it requests the next message from the iterator, or for `end-of-stream`, when the handler returns. Handlers that return early no longer hold up acks.
- Before exiting, including on interrupt, the host posts `run-end` and `end-of-stream` and waits for all acks, with a timeout. The final barrier also waits for the plugin threads to exit, their stdout/stderr pipes to end, and the host destination writes to complete: a control-port ack alone does not establish ordering with worker stdio. On timeout, it sends `terminate`, terminates remaining threads and proceeds.

This is the final synchronization point: AVA doesn't exit before reporters have flushed.

## Failure policy

- A plugin that claims stdout is critical: if its thread crashes or its `observe()` handler throws or rejects, the run aborts.
- Other plugins are non-critical: the host surfaces the failure through its error callback, which the CLI writes to stderr, and the run continues. A dedicated internal run-status event can be added when plugins besides bundled TAP are selectable; this iteration does not add a public protocol event for it.
- Ordering violations and protocol errors are treated like crashes.
- Fatal startup errors (an `error` diagnostic, an incompatible plugin, a flag collision) are a plain crash: buffered notices and the error message go to stderr and the process exits non-zero, as `exit()` does today. No plugin streams exist at that point and none are set up for it. A caller such as an agent is expected to check stderr and the exit code, as it would for any crashed process.

## TAP plugin configuration

While TAP is bundled, `--tap`, `-t` and `tap: true` in config keep working exactly as they do, with no deprecation notice and no change you'd notice. Today the host just loads the bundled plugin when they select it.

- **Flag and alias.** The plugin declares `--tap`, which is also the table's implied activation flag, and the alias `-t` comes from the table (see Flags).
- **Config.** The `tap` config key's value is passed to the plugin as its `options`, so currently a boolean. The plugin decides activation from `flags.tap ?? options`, which keeps today's `combined.tap` behavior.
- **Mode quirks are preserved.** Today `--tap` with watch or debug is an error unless config also sets `tap` (`lib/cli.js`, around lines 289 and 303), and in that case the default reporter is used silently. The plugin reproduces this: it errors if `flags.tap` is set in watch or debug mode without `options`, and it's inactive in those modes in any case.
- **No cost when unselected.** The plugin is only loaded, and a thread only started, if it's selected by effective activation or a `--tap-*` option. That means no extra thread on non-TAP runs, including `tap: false` and `--no-tap`. A selected plugin that turns out to be inactive (watch/debug mode, or a namespaced option alongside disabled activation) still costs a short-lived thread.

## Unbundling TAP

The plan is to unbundle TAP in the next major release, as a breaking change. It then becomes a regular plugin in `@ava/tap`, which users install and configure:

```js
export default {
	plugins: ['@ava/tap'],
};
```

- **Table entry removed.** The `tap` namespace is no longer reserved, and nothing is selected by a static table. The listed plugin is loaded and negotiated before argv is parsed (startup steps 2 and 3), so its `--tap` flag still works, and no lenient selection pass is needed for it. It's still named exactly its namespace, so the naming rule holds.
- **Config key removed.** The top-level `tap` key goes away. Options move to the `plugins` entry (`['@ava/tap', options]`).
- **Alias removed.** Plugins can't declare aliases, and the table that supplied `-t` is gone, so `-t` goes away.
- **Cost.** A listed plugin is loaded on every run, even one where it ends up inactive (`--no-tap`, watch mode). Since users opt in by listing it, that's acceptable, but it's why the thread-per-listed-plugin cost matters more then.
- **Migration.** Using `--tap`/`-t` or the `tap` key without the plugin installed should fail with an error that says to install and list `@ava/tap`, instead of the generic unknown option error.
- **Activation.** The plugin decides in `configure()`, and for `@ava/tap` listing it means it's active, so opt-out instead of opt-in. To turn it off, pass `--no-tap`, or set the default in the plugin's options: `['@ava/tap', {default: false}]`, which makes it opt-in again, through `--tap`. Activation is `flags.tap ?? options?.default ?? true`. (While TAP is bundled it's `flags.tap ?? options`, where options is the value of the `tap` key.) The mode quirks carry over: in watch or debug mode it's silently inactive when active by default, and an error only if `--tap` was passed explicitly.

## Timeouts

Internal constants, not configurable for now:

| What | Timeout | If it expires |
|---|---|---|
| Startup per plugin: spawn, import, `negotiateProtocol()` (including `configure`), calling `observe()` (`ready`) | 10s, in parallel across plugins | Fatal startup error naming the plugin, handled like any startup crash (stderr, non-zero exit). |
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
// `observer`: receives run messages, never renders. `service`: serves test workers from the plugin's thread (shared worker successor).
// `worker`: entry loaded in each test worker (`provider.worker()` successor).
// `observe()` is only available to `observer` and `reporter` plugins.

// A plugin as listed in a `plugins` configuration entry, optionally with options. Bundled plugins aren't listed.
type Specifier = string | readonly [specifier: string, options: unknown];

type FlagDefinition = {/* … */ readonly array?: boolean}; // Repeatable flag, received as an array.

type ConfigureContext = {
	/* … */
	readonly mode: {/* … */ readonly ci: boolean};
};

// `ProtocolInfo.terminal` gains more, for reporters that need it (the default reporter, for code excerpt widths and
// watch mode behavior):
// `columns` is dynamic: a getter backed by a `SharedArrayBuffer` that the host updates on `resize`. Still `readonly`, as
// plugins can't assign it, but its value can change. The buffer isn't exposed: `onResize()` is how plugins find out.
type StreamInfo = {
	readonly isTTY: boolean;
	readonly columns: number | undefined;
	// Calls `listener` with the new width after the terminal was resized. Dispose the result to remove the listener.
	onResize(listener: (columns: number | undefined) => void): Disposable;
};

type Terminal = {
	readonly stdout: StreamInfo & {/* … */};
	readonly stderr: StreamInfo & {readonly colorLevel: 0 | 1 | 2 | 3};
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
	readonly workerEntry?: string; // Requires `worker`. Module URL, loaded in each test worker. Emitted by the plugin, as AVA can't find it itself.
	// A `service` plugin needs no entry of its own: the plugin's thread is the service.
	// Extension point: globs, require hooks.
};

type Notice = {
	readonly level: 'info' | 'warning';
	readonly code: string; // Stable identifier, e.g. `experiments-enabled`.
	readonly message: string; // May contain ANSI styling.
};

// Added to `RunMessage`: not run-scoped, sent after `ready` and before the first `run-start`, only to opted-in plugins.
type NoticeMessage = {readonly type: 'notice'; readonly notice: Notice};
```

Also future:

- **`worker` capability.** The plugin's code for test workers runs in a different thread from the plugin. AVA can't figure out for itself which module that is, as it's not something that can be derived from a plugin package, so the plugin emits a URL for it through the protocol: `Contributions.workerEntry`, returned from `configure()` (where it can depend on the plugin's options and flags). The host passes it on to the test workers, as it does with `providerStates` today, and the module is only loaded when the plugin is active. In the test worker the module has its own `negotiateProtocol()` call, returning that site's protocol, pinned to the identifier the host already negotiated (as providers are in test workers, see `selectProtocol` in `lib/provider-manager.js`), so versions can't get mixed across threads.
- **Control.** A `controller` capability (trigger runs, abort, filter) for the agent reporter after the first version, which only reports. `runId` and the multi-run lifecycle are there for it already.
- **Default reporter as a plugin.** It would add to the protocol:
  - Plan fields `bailWithoutReporting`, `matching`, `previousFailures`, `firstRun`, `emptyParallelRun` and `selectionInsights` (from `plan.status`; check that `selectionInsights` is structured-cloneable).
  - The `interrupt`, `line-number-selection-error` and `shared-worker-error` events, plus `pendingTests` on interrupt, and snapshot counts in `RunTotals`.
  - A host rule for when to prefix titles that knows about watch mode (the default reporter prefixes in watch mode even for a single file).
- **In-process plugins.** A main-thread transport would implement the same `negotiateProtocol()`, `observe()` and control channel.
