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

When you are using ES6 modules, use the dist-file of vue. Not doing that may cause a not completely accessible (and thus not testable) vue model.
```js
import browserEnv from 'browser-env';
import hooks from 'require-extension-hooks';
import Vue from 'vue/dist/vue';

browserEnv();

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

## Sample data test
```js
import test from 'ava';
import Vue from 'vue';
import Component from 'component.vue';

test('it has a message', t => {

	const vm = new Vue(Component).$mount();
	t.is('my message', vm.message);

});
```

## Sample DOM testing with data manipulation

When manipulating the data object of a vue model, the DOM will not be updated immediately. It will be changed on the next tick.

```js
import test from 'ava';
import Vue from 'vue';
import Component from 'component.vue';

test('see the updated message', t => {

	const vm = new Vue(Component).$mount();
	t.is(vm.$el.textContent, 'my message'); 

	vm.message = 'my new message';
	// this fails here: t.is('my new message', vm.$el.textContent)

	Vue.nextTick(() => {
		t.is(vm.$el.textContent, 'my new message');
	});

});
```

## Sample DOM testing with promises

When using promises to fetch data to update the vue model, you have to put your tests in the `then()` function of the pending promise.

```js
import test from 'ava';
import Vue from 'vue';
import Component from 'component.vue';

// Don't forget to add the async prefix
test('update the model using promises', async t => {

	// assume the message data property is a pending promise defined in the Component.
	const vm = new Vue(Component).$mount();

	
	// just testing the data model can be achieved by using await
	t.is(await vm.message, 'my message');
	
	await vm.message.then((data) => {

		// Set the data property to the result of the pending promise
		vm.message = data;

		// In the next tick, the data model changes are applied to the DOM
		Vue.nextTick(() => {
			t.is(vm.$el.textContent, 'my message');
		});
		

	});

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
