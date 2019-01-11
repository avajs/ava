# Configuring Babel

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/babel.md)

AVA uses [Babel 7](https://babeljs.io) so you can use the latest JavaScript syntax in your tests. We do this by compiling test and helper files using our [`@ava/stage-4`](https://github.com/avajs/babel-preset-stage-4) preset. We also use a [second preset, `@ava/transform-test-files`](https://github.com/avajs/babel-preset-transform-test-files) to enable [enhanced assertion messages](../03-assertions.md#enhanced-assertion-messages) and detect improper use of `t.throws()` assertions.

By default our Babel pipeline is applied to test and helper files ending in `.js`. If your project uses Babel then we'll automatically compile these files using your project's Babel configuration. The `@ava/transform-helper-files` preset is applied first, and the `@ava/stage-4` last.

If you are using Babel for your source files then you must also [configure source compilation](#compile-sources).

## Customize how AVA compiles your test files

You can override the default Babel configuration AVA uses for test file compilation in `package.json` or `ava.config.js`. For example, the configuration below adds support for JSX syntax and stage 3 features.

**`package.json`:**

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"plugins": ["@babel/plugin-syntax-jsx"],
				"presets": ["@babel/preset-stage-3"]
			}
		}
	}
}
```

All [Babel options] are allowed inside the `testOptions` object.

## Reset AVA's cache

AVA caches the compiled test and helper files. It automatically recompiles these files when you change them. AVA tries its best to detect changes to your Babel configuration files, plugins and presets. If it seems like your latest Babel configuration isn't being applied, however, you can reset AVA's cache:

```console
$ npx ava --reset-cache
```

## Add additional extensions

You can configure AVA to recognize additional file extensions and compile those test & helper files using Babel.

**`package.json`:**

```json
{
	"ava": {
		"babel": {
			"extensions": [
				"js",
				"jsx"
			]
		}
	}
}
```

See also AVA's [`extensions` option](../06-configuration.md#options).

## Make AVA skip your project's Babel options

You may not want AVA to use your project's Babel options, for example if your project is relying on Babel 6. Set the `babelrc` and `configFile` options to `false`.

**`package.json`:**

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"babelrc": false,
				"configFile": false
			}
		}
	}
}
```

## Disable AVA's stage-4 preset

You can disable AVA's stage-4 preset.

**`package.json`:**

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"presets": [
					["module:ava/stage-4", false]
				]
			}
		}
	}
}
```

Note that this *does not* stop AVA from compiling your test files using Babel.

If you want, you can disable the preset in your project's Babel configuration.

## Preserve ES module syntax

By default AVA's stage-4 preset will convert ES module syntax to CommonJS. This can be disabled.

**`package.json`:**

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"presets": [
					["module:ava/stage-4", {"modules": false}]
				]
			}
		}
	}
}
```

You'll have to use the [`esm`](https://github.com/standard-things/esm) module so that AVA can still load your test files. [See our recipe for details](./es-modules.md).

## Disable AVA's Babel pipeline

You can completely disable AVA's use of Babel.

**`package.json`:**

```json
{
	"ava": {
		"babel": false,
		"compileEnhancements": false
	}
}
```

## Use Babel polyfills

AVA lets you write your tests using new JavaScript syntax, even on Node.js versions that otherwise wouldn't support it. However, it doesn't add or modify built-ins of your current environment. Using AVA would, for example, not provide modern features such as `Object.entries()` to an underlying Node.js 6 environment.

By loading [Babel's `polyfill` module](https://babeljs.io/docs/usage/polyfill/) you can opt in to these features. Note that this will modify the environment, which may influence how your program behaves.

You can enable the `polyfill` module by adding it to AVA's `require` option.

**`package.json`:**

```json
{
	"ava": {
		"require": [
			"@babel/polyfill"
		]
	}
}
```

You'll need to install `@babel/polyfill` yourself.

## Compile sources

AVA does not currently compile source files. You'll have to load [Babel's `register` module](http://babeljs.io/docs/usage/require/), which will compile source files as needed.

You can enable the `register` module by adding it to AVA's `require` option.

**`package.json`:**

```json
{
	"ava": {
		"require": [
			"@babel/register"
		]
	}
}
```

You'll need to install `@babel/register` yourself.

`@babel/register` will *also* process your test and helper files. For most use cases this is unnecessary. If you create a new file that requires `@babel/register` you can tell it which file paths to ignore. For instance in your `test` directory create `_register.js`:

```js
// test/_register.js:
require('@babel/register')({
	// These patterns are relative to the project directory (where the `package.json` file lives):
	ignore: ['node_modules/*', 'test/*']
});
```

Now instead of requiring `@babel/register`, require `test/_register` instead.

**`package.json`:**

```json
{
	"ava": {
		"require": [
			"test/_register.js"
		]
	}
}
```

Note that loading `@babel/register` in every worker process has a non-trivial performance cost. If you have lots of test files, you may want to consider using a build step to compile your sources *before* running your tests. This isn't ideal, since it complicates using AVA's watch mode, so we recommend using `@babel/register` until the performance penalty becomes too great. Setting up a precompilation step is out of scope for this document, but we recommend you check out one of the many [build systems that support Babel](http://babeljs.io/docs/setup/). There is an [issue](https://github.com/avajs/ava/issues/577) discussing ways we could make this experience better.

## Webpack aliases

[Webpack aliases](https://webpack.js.org/configuration/resolve/#resolve-alias) can be used to provide a shortcut to deeply nested or otherwise inconvenient paths. If you already use aliases in your source files, you'll need to make sure you can use the same aliases in your test files.

Install `babel-plugin-webpack-alias-7` as a dev-dependency. Then add the plugin to AVA's Babel config:

`package.json`:

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"plugins": [
					[
						"babel-plugin-webpack-alias-7",
						{
							"config": "./path/to/webpack.config.test.js"
						}
					]
				]
			}
		}
	}
}
```

[Babel options]: https://babeljs.io/docs/en/options
