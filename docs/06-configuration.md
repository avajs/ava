# Configuration

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/06-configuration.md)

All of the [CLI options][CLI] can be configured in the `ava` section of either your `package.json` file, or an `ava.config.js` file. This allows you to modify the default behavior of the `ava` command, so you don't have to repeatedly type the same options on the command prompt.

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
		"helpers": [
			"**/helpers/**/*"
		],
		"sources": [
			"src/**/*"
		],
		"match": [
			"*oo",
			"!foo"
		],
		"cache": true,
		"concurrency": 5,
		"failFast": true,
		"failWithoutAssertions": false,
		"environmentVariables": {
			"MY_ENVIRONMENT_VARIABLE": "some value"
		},
		"tap": true,
		"verbose": true,
		"compileEnhancements": false,
		"require": [
			"@babel/register"
		],
		"babel": {
			"extensions": ["js", "jsx"],
			"testOptions": {
				"babelrc": false
			}
		},
		"nodeArguments": [
				"--trace-deprecation",
				"--napi-modules"
		]
	}
}
```

Arguments passed to the CLI will always take precedence over the CLI options configured in `package.json`.

## Options

- `files`: an array of glob patterns to select test files. Files with an underscore prefix are ignored. By default only selects files with `js` extensions, even if the pattern matches other files. Specify `extensions` and `babel.extensions` to allow other file extensions
- `helpers`: an array of glob patterns to select helper files. Files matched here are never considered as tests. By default only selects files with `js` extensions, even if the pattern matches other files. Specify `extensions` and `babel.extensions` to allow other file extensions
- `sources`: an array of glob patterns to match files that, when changed, cause tests to be re-run (when in watch mode). See the [watch mode recipe for details](https://github.com/avajs/ava/blob/master/docs/recipes/watch-mode.md#source-files-and-test-files)
- `match`: not typically useful in the `package.json` configuration, but equivalent to [specifying `--match` on the CLI](./05-command-line.md#running-tests-with-matching-titles)
- `cache`: cache compiled test and helper files under `node_modules/.cache/ava`. If `false`, files are cached in a temporary directory instead
- `failFast`: stop running further tests once a test fails
- `failWithoutAssertions`: if `false`, does not fail a test if it doesn't run [assertions](./03-assertions.md)
- `environmentVariables`: specifies environment variables to be made available to the tests. The environment variables defined here override the ones from `process.env`
- `tap`: if `true`, enables the [TAP reporter](./05-command-line.md#tap-reporter)
- `verbose`: if `true`, enables verbose output
- `snapshotDir`: specifies a fixed location for storing snapshot files. Use this if your snapshots are ending up in the wrong location
- `compileEnhancements`: if `false`, disables [`power-assert`](./03-assertions.md#enhanced-assertion-messages) — which otherwise helps provide more descriptive error messages — and detection of improper use of the `t.throws()` assertion
- `extensions`: extensions of test files that are not precompiled using AVA's Babel presets. Note that files are still compiled to enable `power-assert` and other features, so you may also need to set `compileEnhancements` to `false` if your files are not valid JavaScript. Setting this overrides the default `"js"` value, so make sure to include that extension in the list, as long as it's not included in `babel.extensions`
- `require`: extra modules to require before tests are run. Modules are required in the [worker processes](./01-writing-tests.md#process-isolation)
- `babel`: test file specific Babel options. See our [Babel recipe](./recipes/babel.md#configuring-babel) for more details
- `babel.extensions`: extensions of test files that will be precompiled using AVA's Babel presets. Setting this overrides the default `"js"` value, so make sure to include that extension in the list
- `timeout`: Timeouts in AVA behave differently than in other test frameworks. AVA resets a timer after each test, forcing tests to quit if no new test results were received within the specified timeout. This can be used to handle stalled tests. See our [timeout documentation](./07-test-timeouts.md) for more options.
- `nodeArguments`: Configure Node.js arguments used to launch worker processes.

Note that providing files on the CLI overrides the `files` option.

## Using `ava.config.js`

To use an `ava.config.js` file:

1. It must be in the same directory as your `package.json`
2. Your `package.json` must not contain an `ava` property (or, if it does, it must be an empty object)
3. You must use `export default`, though [`require()`](https://nodejs.org/api/modules.html#modules_require_id) is available to load non-ES modules

The config file must have a default export, using ES modules. It can either be a plain object or a factory function which returns a plain object:

```js
export default {
	require: ['esm']
};
```

```js
export default function factory() {
	return {
		require: ['esm']
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

Note that the final configuration must not be a promise.

## Alternative configuration files

The [CLI] lets you specify a specific configuration file, using the `--config` flag. This file is processed just like an `ava.config.js` file would be. When the `--config` flag is set, the provided file will override all configuration from the `package.json` and `ava.config.js` files. The configuration is not merged.

The configuration file *must* be in the same directory as the `package.json` file.

You can use this to customize configuration for a specific test run. For instance, you may want to run unit tests separately from integration tests:

`ava.config.js`:

```js
export default {
	files: ['unit-tests/**/*']
};
```

`integration-tests.config.js`:

```js
import baseConfig from './ava.config.js';

export default {
	...baseConfig,
	files: ['integration-tests/**/*']
};
```

You can now run your unit tests through `npx ava` and the integration tests through `npx ava --config integration-tests.config.js`.

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

You can opt in to the new `t.try()` assertion by specifying `tryAssertion`:

`ava.config.js`:
```js
export default {
	nonSemVerExperiments: {
		tryAssertion: true
	}
};
```

[CLI]: ./05-command-line.md
