# Setting up AVA for browser testing

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/browser-testing.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/browser-testing.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/browser-testing.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/browser-testing.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/browser-testing.md)

AVA does not support running tests in browsers [yet](https://github.com/avajs/ava/issues/24). However JavaScript libraries that require browser specific globals (`window`, `document`, `navigator`, etc) can still be tested with AVA by mocking these globals.

This recipe works for any library that needs a mocked browser environment.

## Install browser-env

> **❗️ Important note**
>
>`browser-env` adds properties from the `jsdom` window namespace to the Node.js global namespace. This is explicitly [recommended against](https://github.com/tmpvar/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global) by `jsdom`. Please read through the linked wiki page and make sure you understand the caveats. If you don't have lots of dependencies that also require a browser environment then [`window`](https://github.com/lukechilds/window#universal-testing-pattern) may be a better solution.

Install [browser-env](https://github.com/lukechilds/browser-env).

> Simulates a global browser environment using jsdom.

```
$ npm install --save-dev browser-env
```

## Setup browser-env

Create a helper file and place it in the `test/helpers` folder. This ensures AVA does not treat it as a test.

`test/helpers/setup-browser-env.js`:

```js
import browserEnv from 'browser-env';
browserEnv();
```

By default, `browser-env` will add all global browser variables to the Node.js global scope, creating a full browser environment. This should have good compatibility with most front-end libraries, however, it's generally not a good idea to create lots of global variables if you don't need to. If you know exactly which browser globals you need, you can pass an array of them.

```js
import browserEnv from 'browser-env';
browserEnv(['window', 'document', 'navigator']);
```

You can expose more global variables by assigning them to the `global` object. For instance, jQuery is typically available through the `$` variable:

```js
import browserEnv from 'browser-env';
import jQuery from 'jquery';

browserEnv();
global.$ = jQuery(window);
```

## Configure tests to use browser-env

Configure AVA to `require` the helper before every test file.

`package.json`:

```json
{
	"ava": {
		"require": [
			"./test/helpers/setup-browser-env.js"
		]
	}
}
```

## Enjoy!

Write your tests and enjoy a mocked browser environment.

`test.js`:

```js
import test from 'ava';

test('Insert to DOM', t => {
	const div = document.createElement('div');
	document.body.appendChild(div);

	t.is(document.querySelector('div'), div);
});
```
