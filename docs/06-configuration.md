# Configuration

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/06-configuration.md)

All of the [CLI options][CLI] can be configured in the `ava` section of either your `package.json` file, or an `ava.config.*` file. This allows you to modify the default behavior of the `ava` command, so you don't have to repeatedly type the same options on the command prompt.

To ignore files, prefix the pattern with an `!` (exclamation mark).

**`package.json`:**

```json
{
	"ava": {
		"files": [
			"test/**/*",
			"!test/exclude-files-in-this-directory",
			"!**/exclude-files-with-this-name.*"
		],
		"match": [
			"*oo",
			"!foo"
		],
		"concurrency": 5,
		"failFast": true,
		"failWithoutAssertions": false,
		"environmentVariables": {
			"MY_ENVIRONMENT_VARIABLE": "some value"
		},
		"verbose": true,
		"require": [
			"./my-helper-module.js"
		],
		"nodeArguments": [
			"--trace-deprecation",
			"--napi-modules"
		]
	}
}
```

Arguments passed to the CLI will always take precedence over the CLI options configured in `package.json`.

## Options

- `files`: an array of glob patterns to select test files. Files with an underscore prefix are ignored. By default only selects files with `cjs`, `mjs` & `js` extensions, even if the pattern matches other files. Specify `extensions` to allow other file extensions
- `ignoredByWatcher`: an array of glob patterns to match files that, even if changed, are ignored by the watcher. See the [watch mode recipe for details](https://github.com/avajs/ava/blob/main/docs/recipes/watch-mode.md)
- `match`: not typically useful in the `package.json` configuration, but equivalent to [specifying `--match` on the CLI](./05-command-line.md#running-tests-with-matching-titles)
- `cache`: defaults to `true` to cache compiled files under `node_modules/.cache/ava`. If `false`, files are cached in a temporary directory instead
- `concurrency`: max number of test files running at the same time (default: CPU cores)
- `workerThreads`: use worker threads to run tests (enabled by default). If `false`, tests will run in child processes
- `failFast`: stop running further tests once a test fails
- `failWithoutAssertions`: if `false`, does not fail a test if it doesn't run [assertions](./03-assertions.md)
- `environmentVariables`: specifies environment variables to be made available to the tests. The environment variables defined here override the ones from `process.env`
- `tap`: if `true`, enables the [TAP reporter](./05-command-line.md#tap-reporter)
- `verbose`: if `true`, enables verbose output (though there currently non-verbose output is not supported)
- `snapshotDir`: specifies a fixed location for storing snapshot files. Use this if your snapshots are ending up in the wrong location
- `extensions`: extensions of test files. Setting this overrides the default `["cjs", "mjs", "js"]` value, so make sure to include those extensions in the list. [Experimentally you can configure how files are loaded](#configuring-module-formats)
- `require`: extra modules to require before tests are run. Modules are required in the [worker processes](./01-writing-tests.md#test-isolation)
- `timeout`: Timeouts in AVA behave differently than in other test frameworks. AVA resets a timer after each test, forcing tests to quit if no new test results were received within the specified timeout. This can be used to handle stalled tests. See our [timeout documentation](./07-test-timeouts.md) for more options.
- `nodeArguments`: Configure Node.js arguments used to launch worker processes.
- `sortTestFiles`: A comparator function to sort test files with. Available only when using a `ava.config.*` file. See an example use case [here](recipes/splitting-tests-ci.md).
- `utilizeParallelBuilds`: If `false`, disable [parallel builds](/docs/recipes/splitting-tests-ci.md) (default: true)

Note that providing files on the CLI overrides the `files` option.

Provide the `typescript` option (and install [`@ava/typescript`](https://github.com/avajs/typescript) as an additional dependency) for AVA to run tests written in TypeScript.

## Using `ava.config.*` files

Rather than specifying the configuration in the `package.json` file you can use `ava.config.js`, `ava.config.cjs` or `ava.config.mjs` files.

To use these files:

1. Your `package.json` must not contain an `ava` property (or, if it does, it must be an empty object)
2. You must only have one `ava.config.*` file in any directory, so don't mix `ava.config.js` *and* `ava.config.cjs` files

AVA searches your file system for `ava.config.*` files. First, when you run AVA, it finds the closest `package.json`. Starting in that directory it recursively checks the parent directories until it either reaches the file system root or encounters a `.git` file or directory. The first `ava.config.*` file found is selected. This allows you to use a single configuration file in a monorepo setup.

### `ava.config.js`

AVA follows Node.js' behavior, so if you've set `"type": "module"` you must use ESM, and otherwise you must use CommonJS.

The default export can either be a plain object or a factory function which returns a plain object. You can export or return a promise for a plain object:

```js
export default {
	require: ['./_my-test-helper']
};
```

```js
export default function factory() {
	return {
		require: ['./_my-test-helper']
	};
};
```

The factory function is called with an object containing a `projectDir` property, which you could use to change the returned configuration:

```js
export default ({projectDir}) => {
	if (projectDir === '/Users/username/projects/my-project') {
		return {
			// Config A
		};
	}

	return {
		// Config B
	};
};
```

### `ava.config.cjs`

For `ava.config.cjs` files you must assign `module.exports`. ["Module scope"](https://nodejs.org/docs/latest-v12.x/api/modules.html#modules_the_module_scope) is available. You can `require()` dependencies.

The module export can either be a plain object or a factory function which returns a plain object. You can export or return a promise for a plain object:

```js
module.exports = {
	require: ['./_my-test-helper']
};
```

```js
module.exports = () => {
	return {
		require: ['./_my-test-helper']
	};
};
```

The factory function is called with an object containing a `projectDir` property, which you could use to change the returned configuration:

```js
module.exports = ({projectDir}) => {
	if (projectDir === '/Users/username/projects/my-project') {
		return {
			// Config A
		};
	}

	return {
		// Config B
	};
};
```

### `ava.config.mjs`

The default export can either be a plain object or a factory function which returns a plain object. You can export or return a promise for a plain object:

```js
export default {
	require: ['./_my-test-helper']
};
```

```js
export default function factory() {
	return {
		require: ['./_my-test-helper']
	};
};
```

The factory function is called with an object containing a `projectDir` property, which you could use to change the returned configuration:

```js
export default ({projectDir}) => {
	if (projectDir === '/Users/username/projects/my-project') {
		return {
			// Config A
		};
	}

	return {
		// Config B
	};
};
```

## Alternative configuration files

The [CLI] lets you specify a specific configuration file, using the `--config` flag. This file must have either a `.js`, `.cjs` or `.mjs` extension and is processed like an `ava.config.js`, `ava.config.cjs` or `ava.config.mjs` file would be.

When the `--config` flag is set, the provided file will override all configuration from the `package.json` and `ava.config.js`, `ava.config.cjs` or `ava.config.mjs` files. The configuration is not merged.

You can use this to customize configuration for a specific test run. For instance, you may want to run unit tests separately from integration tests:

`ava.config.cjs`:

```js
module.exports = {
	files: ['unit-tests/**/*']
};
```

`integration-tests.config.cjs`:

```js
const baseConfig = require('./ava.config.cjs');

module.exports = {
	...baseConfig,
	files: ['integration-tests/**/*']
};
```

You can now run your unit tests through `npx ava` and the integration tests through `npx ava --config integration-tests.config.cjs`.

## Object printing depth

By default, AVA prints nested objects to a depth of `3`. However, when debugging tests with deeply nested objects, it can be useful to print with more detail. This can be done by setting [`util.inspect.defaultOptions.depth`](https://nodejs.org/api/util.html#util_util_inspect_defaultoptions) to the desired depth, before the test is executed:

```js
import util from 'util';

import test from 'ava';

util.inspect.defaultOptions.depth = 5;  // Increase AVA's printing depth

test('My test', t => {
	t.deepEqual(someDeeplyNestedObject, theExpectedValue);
});
```

AVA has a minimum depth of `3`.

## Experiments

From time to time, AVA will implement experimental features. These may change or be removed at any time, not just when there's a new major version. You can opt in to such a feature by enabling it in the `nonSemVerExperiments` configuration.

`ava.config.js`:
```js
export default {
	nonSemVerExperiments: {
		feature: true
	}
};
```

## Configuring module formats

Node.js can only load non-standard extension as ES Modules when using [experimental loaders](https://nodejs.org/docs/latest/api/esm.html#esm_experimental_loaders). To use this you'll also have to configure AVA to `import()` your test file.

As with the array form, you need to explicitly list `js`, `cjs`, and `mjs` extensions. These **must** be set using the `true` value; other extensions are configurable using either `'commonjs'` or `'module'`:

`ava.config.js`:
```js
export default {
	extensions: {
		js: true,
		ts: 'module'
	}
};
```

## Node arguments

The `nodeArguments` configuration may be used to specify additional arguments for launching worker processes. These are combined with `--node-arguments` passed on the CLI and any arguments passed to the `node` binary when starting AVA.

[CLI]: ./05-command-line.md
