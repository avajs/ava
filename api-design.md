** This document is for team discussion. Not intended as documentation**


## Current API

```js
new Api(apiOptions).run(files, runOptions)
```

### constructor

#### apiOptions

- **match** - `Array` of `strings` - Used to filter on test titles via `--match` flag.

- **require** - `Array` of `strings` - Modules to be loaded before the test runs.

- **timeout** - `string` - Human readable timeout (`10m`, `2s`, etc).

- **cacheDir** - `string` - Path to the cacheDir.

- **babelConfig** - `Object` - or shortcut `string` - The babel config.

- **serial** - `boolean` - Run everything serially.

- **explicitTitles** - `boolean` - Force inclusion of the filename in test titles.

- **cacheEnabled** - `boolean` - Defaults true. Set to `false` with the `--no-cache` flag.

- **concurrency** - `number` - How many processes at once.

- **failFast** - `boolean` - bail at first failure



### run(files, runOptions)


#### files

- `string` or `Array of strings`.

#### runOptions

- **runOnlyExclusive** - `boolean` - Used by watcher to handle `.only` tests.


## Watcher

### constructor

```js
new Watcher(logger, api, files, sources);
```

- **logger** - Instance of `lib/logger.js`, already populated with the correct reporter. Watcher currently needs this separately so it can reset the reporters between test runs (reset is needed by anything that uses control characters).

- **api** - An instance of the API, already passed all it's options.

- **files** - Glob patterns to watch

- **files** - Glob patterns to restrict source watching. Otherwise any change to a file that is not a source causes a watcher rerun.


# Events

## IPC Events

- :arrow_up: `no-tests` - `{avaRequired: boolean}`

- :arrow_up: `uncaughtException` - `{exception: serializedError}`

  Parent will immediately send the `teardown` event.

- :arrow_up: `unhandledRejections` - `{rejections: serializedError[]}`

  Sent in response to a `ava-teardown` event from parent.

- :arrow_up: `teardown` - `{dependencies: strings[]}`

  Sent in response to `ava-teardown` event from parent.

- :arrow_up: `test` - Reports a test result.

- :arrow_up: `results` - All the test results. (Why two events that send results?).

  Sent in response to `init-exit`, or immediately on an error in `fail-fast` mode.

  `{stats: ???}`

- :arrow_up: `stats`

  Parent sends `run` event in response. Does so immediately if `fork.run()` is already called, otherwise waits for it.

  `{testCount: number, hasExclusive: boolean}`

- :arrow_down: `ava-teardown` - no data - tells the child to prepare for shutdown and send the list of dependencies and rejections.

- :arrow_down: `ava-exit` - no data - actually kill the process

- :arrow_down: `ava-run` - start running tests

- :arrow_down: `init-exit` - inits the exit? This sounds like `ava-teardown`

## Fork Events

Re-emits all the :arrow_up: IPC events. As well as `stdout` and `stderr` events.

## Runner Events

Emits only one from what I can tell: `test` - The event has props:

```js
opts = {
  duration: number,
  title: string,
  error: error,
  type: test.metadata.type,
  skip: test.metadata.skipped,
  todo: test.metadata.todo,
  failing: test.metadata.failing
}
```
