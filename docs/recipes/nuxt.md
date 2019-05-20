# Testing Vue.js components with Nuxt.js

## Dependencies

- [Require extension hooks](https://github.com/jackmellis/require-extension-hooks):
	- `npm i --save-dev require-extension-hooks require-extension-hooks-vue require-extension-hooks-babel@beta`

- [browser-env](browser-testing.md)
	- `npm i --save-dev browser-env`

- [babel-plugin-module-resolver](https://github.com/tleunen/babel-plugin-module-resolver#readme)
	- `npm i --save-dev babel-plugin-module-resolver`

## Setup

First set up a helper to configure the environment to transpile `.vue` files and run in a browser like environment.

**`package.json`:**

```json
{
	"ava": {
		"require": [
			"@babel/register",
			"./test/_setup.js"
		]
	}
}
```

```js
// ./test/_setup.js

// Setup browser environment
require('browser-env')();
const hooks = require('require-extension-hooks');
const Vue = require('vue');

// Setup Vue.js to remove production tip
Vue.config.productionTip = false;

// https://github.com/nuxt/create-nuxt-app/issues/180
window.Date = global.Date = Date;

// Setup `.vue` files to be processed by `require-extension-hooks-vue`
hooks('vue').plugin('vue').push();
// Setup `.vue` and `.js` files to be processed by `require-extension-hooks-babel`
hooks(['vue', 'js']).exclude(({filename}) => filename.match(/\/node_modules\//)).plugin('babel').push();
```

**`.babelrc`:**
```json
{
	"env": {
		"test": {
			"plugins": [
				[
					"module-resolver",
					{
						"root": [
							"."
						],
						"alias": {
							"@": ".",
							"~": "."
						}
					}
				]
			],
			"ignore": [
				"ava.config.js"
			],
			"presets": [
				[
					"@babel/preset-env",
					{
						"targets": {
							"node": "current"
						}
					}
				]
			]
		}
	}
}
```

You can find more information about setting up Babel with AVA in the [Babel recipe](babel.md).

## Sample snapshot test

```js
import {mount, createLocalVue} from '@vue/test-utils';
import test from 'ava';
import Index from '@/pages/index.vue';

let wrapper;
const localVue = createLocalVue();

test.beforeEach(() => {
	wrapper = mount(Index, {
		localVue,
	});
});

test('is a Vue instance', t => {
	t.true(wrapper.isVueInstance());
});

test('renders correct snapshot', t => {
	t.snapshot(wrapper.vm.$el.outerHTML);
});
```

## Coverage reporting

Follow the [coverage reporting recipe](code-coverage.md), and also add the `.vue` extension to the `nyc` config to instrument `.vue` files.

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

**Note:** [Demo project using Nuxt.js and AVA for E2E and unit testing.](https://github.com/vinayakkulkarni/nuxt-ava-e2e-unit-testing)
