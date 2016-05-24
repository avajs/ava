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
