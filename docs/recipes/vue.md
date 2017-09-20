# Testing Vue.js components

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/vue.md)

## Dependencies

- [Require extension hooks](https://github.com/jackmellis/require-extension-hooks):
	- `npm i --save-dev require-extension-hooks require-extension-hooks-vue require-extension-hooks-babel`

- [browser-env](browser-testing.md)
	- `npm i --save-dev browser-env`

## Setup

The first step is setting up a helper to configure the environment to transpile `.vue` files and run in a browser like environment:

```json
{
	"ava": {
		"babel": "inherit",
		"require": [
			"./test/helpers/setup.js"
		]
	}
}
```

```js
// ./test/helpers/setup.js

// Setup browser environment
require('browser-env')();
const hooks = require('require-extension-hooks');
const Vue = require('vue');

// Setup Vue.js to remove production tip
Vue.config.productionTip = false;

// Setup vue files to be processed by `require-extension-hooks-vue`
hooks('vue').plugin('vue').push();
// Setup vue and js files to be processed by `require-extension-hooks-babel`
hooks(['vue', 'js']).plugin('babel').push();
```

You can find more information about setting up Babel with AVA in the [babelrc recipe](babelrc.md).

## Sample snapshot test

```js
import test from 'ava';
import Vue from 'vue';
import Component from 'component.vue';

test('renders', t => {
	const vm = new Vue(Component).$mount();
	const tree = {
		$el: vm.$el.outerHTML
	};
	t.snapshot(tree);
});
```

## Coverage reporting

Follow the [coverage reporting recipe](code-coverage.md), additionally adding the `.vue` extension to the `nyc` config to instrument `.vue` files.

```json
{
	"nyc": {
		"extension": [
			".js",
			".vue"
		]
	}
}
```
