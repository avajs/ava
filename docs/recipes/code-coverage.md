# Code coverage

Translations: [Español](https://github.com/sindresorhus/ava-docs/blob/master/es_ES/docs/recipes/code-coverage.md), [Français](https://github.com/sindresorhus/ava-docs/blob/master/fr_FR/docs/recipes/code-coverage.md), [日本語](https://github.com/sindresorhus/ava-docs/blob/master/ja_JP/docs/recipes/code-coverage.md), [Português](https://github.com/sindresorhus/ava-docs/blob/master/pt_BR/docs/recipes/code-coverage.md), [Русский](https://github.com/sindresorhus/ava-docs/blob/master/ru_RU/docs/recipes/code-coverage.md)

As AVA [spawns the test files][process-isolation], you can't use [`istanbul`] for code coverage; instead, you can achieve this with [`nyc`] which is basically [`istanbul`] with sub-process support.

## Setup

First install NYC:

```
$ npm install nyc --save-dev
```

Then add both the `.nyc_output` and `coverage` directories to your `.gitignore` file.

`.gitignore`:

```
node_modules
coverage
.nyc_output
```

## ES5 coverage

Using NYC to provide coverage for production code written in ES5 is simple. Just prepend your test script with `nyc`:

```json
{
	"scripts": {
		"test": "nyc ava"
	}
}
```

That's it!

If you want to create HTML coverage reports, or upload coverage data to Coveralls, you should skip down to those sections below.

## ES2015 coverage

Using Babel to transpile your production code is a bit more involved. Here we've broken it down into multiple steps.

### Configure Babel

First, we need a Babel configuration. The following is just an example. You will need to modify it to fit your needs.

`package.json`:
```json
{
	"babel": {
		"presets": ["es2015"],
		"plugins": ["transform-runtime"],
		"ignore": "test.js",
		"env": {
			"development": {
				"sourceMaps": "inline"
			}
		}
	}
}
```

There are two important things to note from the example above.

1. We ignore test files because AVA already handles transpiling tests for you.

2. We specify `inline` source maps for development. This is important for properly generating coverage. Using the `env` section of the Babel configuration allows us to disable source maps for production builds.


### Create a build script

Since it is unlikely you want `inline` source maps in your production code. You should specify an alternate environment variable in your build scripts:

`package.json`

```json
{
	"scripts": {
		"build": "BABEL_ENV=production babel --out-dir=dist index.js"
	}
}
```

> WARNING: `BABEL_ENV=production` does not work on Windows, you must use the `set` keyword  (`set BABEL_ENV=production`).  For cross platform builds, check out [`cross-env`].

Note that the build script really has very little to do with AVA, and is just a demonstration of how to use Babel's `env` configuration to manipulate your config so it's compatible with AVA.

### Use the Babel require hook

To use the Babel require hook, add `babel-core/register` to the `require` section of you AVA config in `package.json`.

```json
{
	"ava": {
		"require": ["babel-core/register"]
	}
}
```

*Note*: You can also set the require hook from the command line: `ava --require=babel-core/register`. However, configuring it in `package.json` saves you from repeatedly typing that flag.

### Putting it all together

Combining the above steps, your complete `package.json` should look something like this:

```json
{
	"scripts": {
		"test": "nyc ava",
		"build": "BABEL_ENV=production babel --out-dir=dist index.js"
	},
	"babel": {
		"presets": ["es2015"],
		"plugins": ["transform-runtime"],
		"ignore": "test.js",
		"env": {
			"development": {
				"sourceMaps": "inline"
			}
		}
	},
	"ava": {
		"require": ["babel-core/register"]
	}
}
```


## HTML reports

NYC creates a `json` coverage file for each forked process in the `.nyc_ouput` directory.

To combine those into a human readable HTML report, do the following:

```
$ ./node_modules/.bin/nyc report --reporter=html
```

Or, use an npm script to save on typing:

```json
{
	"scripts": {
		"report": "nyc report --reporter=html"
	}
}
```

This will output a HTML file to the `coverage` directory.


## Hosted coverage

### Travis CI & Coveralls

First, you must login to [coveralls.io] and activate your repository.

Once that is done, add [`coveralls`] as a development dependency:

```
$ npm install coveralls --save-dev
```

Then add the following to your `.travis.yml`:

```yaml
after_success:
	- './node_modules/.bin/nyc report --reporter=text-lcov | ./node_modules/.bin/coveralls'
```

Your coverage report will then appear on coveralls shortly after Travis completes.

[`babel`]:      https://github.com/babel/babel
[coveralls.io]: https://coveralls.io
[`coveralls`]:  https://github.com/nickmerwin/node-coveralls
[`cross-env`]:  https://github.com/kentcdodds/cross-env
[process-isolation]: https://github.com/sindresorhus/ava#process-isolation
[`istanbul`]:   https://github.com/gotwarlost/istanbul
[`nyc`]:        https://github.com/bcoe/nyc
