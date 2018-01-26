# Configuring Babel

AVA uses [Babel 7](https://babeljs.io) so you can use the latest JavaScript syntax in your tests. We do this by compiling test and helper files using our [`@ava/stage-4`](https://github.com/avajs/babel-preset-stage-4) preset. We also use a [second preset](https://github.com/avajs/babel-preset-transform-test-files) to enable [enhanced assertion messages](../../readme#enhanced-assertion-messages) and detect improper use of `t.throws()` assertions.

By default our Babel pipeline is applied to test and helper files ending in `.js`. If your project uses Babel then we'll automatically compile files using your project's Babel configuration.

AVA only looks for Babel configuration files in your project directory. That is, `.babelrc` or `.babelrc.js` files next to your `package.json` file, or the `package.json` file itself.

## Customize how AVA compiles your test files

You can override the default Babel configuration AVA uses for test file compilation in `package.json`. For example, the configuration below adds support for JSX syntax and stage 3 features:

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

All `.babelrc` options are allowed inside the `testOptions` object.

## Make AVA skip your project's Babel options

You may not want AVA to use your project's Babel options, for example if your project is relying on Babel 6. You can set the `babelrc` option to `false`:

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"babelrc": false
			}
		}
	}
}
```

## Disable AVA's stage-4 preset

You can disable AVA's stage-4 preset:

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

## Use Babel polyfills

AVA lets you write your tests using new JavaScript syntax, even on Node.js versions that otherwise wouldn't support it. However, it doesn't add or modify built-ins of your current environment. Using AVA would, for example, not provide modern features such as `Object.entries()` to an underlying Node.js 6 environment.

By loading [Babel's `polyfill` module](https://babeljs.io/docs/usage/polyfill/) you can opt in to these features. Note that this will modify the environment, which may influence how your program behaves.

You can enable the `polyfill` module by adding it to AVA's `require` option:

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

You can enable the `register` module by adding it to AVA's `require` option:

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

Note that loading `@babel/register` in every worker process has a non-trivial performance cost. If you have lots of test files, you may want to consider using a build step to compile your sources *before* running your tests. This isn't ideal, since it complicates using AVA's watch mode, so we recommend using `@babel/register` until the performance penalty becomes too great. Setting up a precompilation step is out of scope for this document, but we recommend you check out one of the many [build systems that support Babel](http://babeljs.io/docs/setup/). There is an [issue](https://github.com/avajs/ava/issues/577) discussing ways we could make this experience better.
