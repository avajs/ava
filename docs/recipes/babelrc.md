# Configuring Babel

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/babelrc.md)

There are multiple options for configuring how AVA transpiles your tests using Babel.

 - [AVA's default transpiler behavior](#avas-default-transpiler-behavior)
 - [Customizing how AVA transpiles your tests](#customizing-how-ava-transpiles-your-tests)
 - [Transpiling Sources](#transpiling-sources)
 - [Transpiling tests and sources the same way](#transpiling-tests-and-sources-the-same-way)
 - [Extend your source transpilation configuration](#extend-your-source-transpilation-configuration)
 - [Extend an alternate config file (i.e. not `.babelrc`)](#extend-an-alternate-config-file)

## AVA's default transpiler behavior

AVA lets you use some nifty JavaScript features, like [async functions](https://github.com/avajs/ava#async-function-support). To make this work on older Node.js versions AVA transpiles the tests and helper files using the [`@ava/stage-4`](https://github.com/avajs/babel-preset-stage-4) Babel preset. This is great for projects where you do not use Babel for your source, but do want to use the newest JavaScript features for your tests.

## Customizing how AVA transpiles your tests

You can override the default Babel configuration AVA uses for test transpilation in `package.json`. For example, the configuration below adds the Babel `rewire` plugin, and adds the Babel [`stage-3`](http://babeljs.io/docs/plugins/preset-stage-3/) preset.

```json
{
	"ava": {
		"babel": {
			"plugins": ["rewire"],
			"presets": ["@ava/stage-4", "stage-3"]
		}
	}
}
```

## Use Babel Polyfills

AVA lets you write your tests using new JavaScript syntax, even on Node.js versions that otherwise wouldn't support it. However, it doesn't add or modify built-ins of your current environment. Using AVA would, for example, not provide modern features such as `Array.prototype.includes()` to an underlying Node.js 4 environment.

By loading [Babel's Polyfill module](https://babeljs.io/docs/usage/polyfill/) you can opt in to these features. Note that this will modify the environment, which may influence how your program behaves.

You can enable `babel-polyfill` by adding it to AVA's `require` option:

```json
{
	"ava": {
		"require": [
			"babel-polyfill"
		]
	}
}
```

## Transpiling Sources

To transpile your sources, you will need to define a [`babel config` ](http://babeljs.io/docs/usage/babelrc/) in `package.json` or a `.babelrc` file. Also, you will need to tell AVA to load [`babel-register`](http://babeljs.io/docs/usage/require/) in every forked process, by adding it to the `require` section of your AVA config:

`package.json`

```json
{
	"ava": {
		"require": ["babel-register"]
	},
	"babel": {
		"presets": ["@ava/stage-4"]
	}
}
```

Note that loading `babel-register` in every forked process has a non-trivial performance cost. If you have lots of test files, you may want to consider using a build step to transpile your sources *before* running your tests. This isn't ideal, since it complicates using AVA's watch mode, so we recommend using `babel-register` until the performance penalty becomes too great. Setting up a precompilation step is out of scope for this document, but we recommend you check out one of the many [build systems that support Babel](http://babeljs.io/docs/setup/). There is an [open issue](https://github.com/avajs/ava/issues/577) discussing ways we could make this experience better.

## Transpiling tests and sources the same way

Using the `"inherit"` shortcut will cause your tests to be transpiled the same as your sources (as specified in your [`babelrc`](http://babeljs.io/docs/usage/babelrc/)). AVA will add a few additional [internal plugins](#notes) when transpiling your tests, but they won't affect the behavior of your test code.

`package.json`:

```json
{
	"ava": {
		"require": "babel-register",
		"babel": "inherit"
	},
	"babel": {
		"presets": [
			"@ava/stage-4",
			"react"
		]
	}
}
```

In the above example, both tests and sources will be transpiled using the [`@ava/stage-4`](https://github.com/avajs/babel-preset-stage-4) and [`react`](http://babeljs.io/docs/plugins/preset-react/) presets.

AVA will only look for a `.babelrc` file in the same directory as the `package.json` file. If not found then it assumes your Babel config lives in the `package.json` file.

## Extend your source transpilation configuration

When specifying the Babel config for your tests, you can set the `babelrc` option to `true`. This will merge the specified plugins with those from your [`babelrc`](http://babeljs.io/docs/usage/babelrc/).

`package.json`:

```json
{
	"ava": {
		"require": "babel-register",
		"babel": {
			"babelrc": true,
			"plugins": ["custom-plugin-name"],
			"presets": ["custom-preset"]
		}
	},
	"babel": {
		"presets": [
			"@ava/stage-4",
			"react"
		]
	}
}
```

In the above example, *sources* are compiled use [`@ava/stage-4`](https://github.com/avajs/babel-preset-stage-4) and [`react`](http://babeljs.io/docs/plugins/preset-react/), *tests* use those same plugins, plus the additional `custom` plugins specified.

AVA will only look for a `.babelrc` file in the same directory as the `package.json` file. If not found then it assumes your Babel config lives in the `package.json` file.

## Extend an alternate config file.

If, for some reason, your Babel config is not specified in one of the default locations ([`.babelrc` or `package.json`](http://babeljs.io/docs/usage/babelrc/), you can set the `extends` option to the alternate config you want to use during testing.

`package.json`:

```json
{
	"ava": {
		"require": "babel-register",
		"babel": {
			"extends": "./babel-test-config.json",
			"plugins": ["custom-plugin-name"],
			"presets": ["custom-preset"]
		}
	}
}
```

The above uses `babel-test-config.json` as the transpilation config for *sources*, and as the base config for *tests*. For *tests*, it extends that base config with the custom plugins and presets specified.
