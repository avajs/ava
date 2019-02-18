# Configuration

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/06-configuration.md)

All of the [CLI options](./05-command-line.md) can be configured in the `ava` section of either your `package.json` file, or an `ava.config.js` file. This allows you to modify the default behavior of the `ava` command, so you don't have to repeatedly type the same options on the command prompt.

To ignore a file or directory, prefix the pattern with an `!` (exclamation mark).

**`package.json`:**

```json
{
	"ava": {
		"files": [
			"my-test-directory/**/*.js",
			"!my-test-directory/exclude-this-directory/**/*.js",
			"!**/exclude-this-file.js"
		],
		"sources": [
			"**/*.{js,jsx}",
			"!dist/**/*"
		],
		"match": [
			"*oo",
			"!foo"
		],
		"cache": true,
		"concurrency": 5,
		"failFast": true,
		"failWithoutAssertions": false,
		"tap": true,
		"verbose": true,
		"compileEnhancements": false,
		"require": [
			"@babel/register"
		],
		"babel": {
			"extensions": ["jsx"],
			"testOptions": {
				"babelrc": false
			}
		}
	}
}
```

Arguments passed to the CLI will always take precedence over the CLI options configured in `package.json`.

## Options

- `files`: file & directory paths and glob patterns that select which files AVA will run tests from. Files with an underscore prefix are ignored. All matched files in selected directories are run. By default only selects files with `js` extensions, even if the glob pattern matches other files. Specify `extensions` and `babel.extensions` to allow other file extensions
- `sources`: files that, when changed, cause tests to be re-run in watch mode. See the [watch mode recipe for details](https://github.com/avajs/ava/blob/master/docs/recipes/watch-mode.md#source-files-and-test-files)
- `match`: not typically useful in the `package.json` configuration, but equivalent to [specifying `--match` on the CLI](./05-command-line.md#running-tests-with-matching-titles)
- `cache`: cache compiled test and helper files under `node_modules/.cache/ava`. If `false`, files are cached in a temporary directory instead
- `failFast`: stop running further tests once a test fails
- `failWithoutAssertions`: if `false`, does not fail a test if it doesn't run [assertions](./03-assertions.md)
- `tap`: if `true`, enables the [TAP reporter](./05-command-line.md#tap-reporter)
- `verbose`: if `true`, enables verbose output
- `snapshotDir`: specifies a fixed location for storing snapshot files. Use this if your snapshots are ending up in the wrong location
- `compileEnhancements`: if `false`, disables [power-assert](https://github.com/power-assert-js/power-assert) — which otherwise helps provide more descriptive error messages — and detection of improper use of the `t.throws()` assertion
- `extensions`: extensions of test files that are not precompiled using AVA's Babel presets. Note that files are still compiled to enable power-assert and other features, so you may also need to set `compileEnhancements` to `false` if your files are not valid JavaScript. Setting this overrides the default `"js"` value, so make sure to include that extension in the list, as long as it's not included in `babel.extensions`
- `require`: extra modules to require before tests are run. Modules are required in the [worker processes](./01-writing-tests.md#process-isolation)
- `babel`: test file specific Babel options. See our [Babel recipe](./recipes/babel.md#configuring-babel) for more details
- `babel.extensions`: extensions of test files that will be precompiled using AVA's Babel presets. Setting this overrides the default `"js"` value, so make sure to include that extension in the list
- `timeouts`: Timeouts in AVA behave differently than in other test frameworks. AVA resets a timer after each test, forcing tests to quit if no new test results were received within the specified timeout. This can be used to handle stalled tests. See our [Timeout tests](./test-timeouts.md#Test-timouts) for more timeout options.

Note that providing files on the CLI overrides the `files` option. If you've configured a glob pattern, for instance `test/**/*.test.js`, you may want to repeat it when using the CLI: `ava 'test/integration/*.test.js'`.

## Using `ava.config.js`

To use an `ava.config.js` file:

 1. It must be in the same directory as your `package.json`
 2. Your `package.json` must not contain an `ava` property (or, if it does, it must be an empty object)

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
