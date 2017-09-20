# JSPM and SystemJS for ES2015

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/jspm-systemjs.md)

It requires a special loader helper to correctly resolve `import`s of JSPM packages when using AVA. The purpose of the loader is to allow you to run your tests without having to pre-build your JSPM project.

## Setup

This recipe has only been tested with JSPM v0.17.0-beta.22, but it should work with any version of JSPM v0.17 and may work with v0.16.

### Babel

Configure your .babelrc to work with AVA if you have not already. NOTE: You can keep additional configuration in your JSPM config files to override these settings during bundling and building.

```json
{
	"presets": ["es2015", "stage-2"]
}
```

You can find more information about setting up Babel with AVA in the [babelrc recipe](babelrc.md).

### JSPM Loader Helper

You will need to install the [AVA JSPM loader](https://github.com/skorlir/ava-jspm-loader) as a dev dependency.

```
$ npm install --save-dev ava-jspm-loader
```

You will also need to update your AVA config in package.json to use the JSPM loader.

```json
{
	"ava": {
		"require": [
			"babel-register",
			"ava-jspm-loader"
		]
	}
}
```

NOTE: If you use async/await in your source code (not in your test code), you will need to install `babel-polyfill` from npm and add it to your `require` array.

### Example test file

Note that you will need to use `System.import` paths for all of your project files. So, if you named your project `app` and you want to import your `main.js` into a test file, you will need to `import main from 'app/main'`.

```js
import test from 'ava';
import main from 'app/main';  // Maps to your JSPM config for "app/main.js"
import BigNumber from 'bignumber.js';  // In jspm_packages

function fn() {
	return Promise.resolve(new BigNumber('1234567890.123456789'));
}

test('example test', async t => {
	t.is((await fn()).toString(), '1234567890.123456789');
});
```
