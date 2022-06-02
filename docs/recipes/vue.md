# Testing Vue.js components

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/vue.md)

## Dependencies

- [Require extension hooks](https://github.com/jackmellis/require-extension-hooks):
	- `npm i --save-dev require-extension-hooks require-extension-hooks-vue require-extension-hooks-babel@beta`

- [jsdom-global](https://github.com/rstacruz/jsdom-global/blob/master/README.md)
	- `npm i --save-dev jsdom jsdom-global`

- Optional: [babel-plugin-webpack-alias-7](https://github.com/shortminds/babel-plugin-webpack-alias-7) if you want to use [webpack aliases](https://webpack.js.org/configuration/resolve/#resolve-alias) or use them in your source files
	- `npm i --save-dev babel-plugin-webpack-alias-7`

## Setup

The first step is setting up a helper to configure the environment to transpile `.vue` files and run in a browser like environment.

**`package.json`:**

```json
{
	"ava": {
		"require": [
			"./test/_setup.js"
		]
	}
}
```

```js
// ./test/_setup.cjs

// Set up JSDom.
const jsdomGlobal = require('jsdom-global');
jsdomGlobal();

// Fix the Date object, see <https://github.com/vuejs/vue-test-utils/issues/936#issuecomment-415386167>.
window.Date = Date

// Setup browser environment
const hooks = require('require-extension-hooks');
const Vue = require('vue');

// Setup Vue.js to remove production tip
Vue.config.productionTip = false;

// Setup vue files to be processed by `require-extension-hooks-vue`
hooks('vue').plugin('vue').push();
// Setup vue and js files to be processed by `require-extension-hooks-babel`
hooks(['vue', 'js']).exclude(({filename}) => filename.match(/\/node_modules\//)).plugin('babel').push();
```

**Note:** If you are using _babel-plugin-webpack-alias-7_, you must also exclude your webpack file - e.g. `filename.includes(/\/node_modules\//) || filename.includes('webpack.config.test.js')`

## Sample snapshot test

```js
const test = require('ava');
const Vue = require('vue');
const Component = require('component.vue');

test('renders', t => {
	const vm = new Vue(Component).$mount();
	const tree = {
		$el: vm.$el.outerHTML
	};
	t.snapshot(tree);
});
```

## Coverage reporting

Follow the [coverage reporting recipe](code-coverage.md), additionally adding the `.vue` extension to the `c8` config to instrument `.vue` files.

```json
{
	"c8": {
		"extension": [
			".js",
			".vue"
		]
	}
}
```
