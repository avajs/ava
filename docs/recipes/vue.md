# Testing Vue.js components

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/vue.md)

## Dependencies

- [Require extension hooks](https://github.com/jackmellis/require-extension-hooks):
	- `npm i --save-dev require-extension-hooks require-extension-hooks-vue require-extension-hooks-babel@beta`

- [jsdom-global](https://github.com/rstacruz/jsdom-global/blob/master/README.md)
	- `npm i --save-dev jsdom jsdom-global`

- Optional: [babel-plugin-webpack-alias-7](https://github.com/shortminds/babel-plugin-webpack-alias-7) if you want to use [webpack aliases](https://webpack.js.org/configuration/resolve/#resolve-alias) or use them in your source files
	- `npm i --save-dev babel-plugin-webpack-alias-7`

## Status

This recipe relied on legacy `require()` hooks. AVA is ESM-only, so this setup is no longer supported.

Precompile your Vue components before running AVA, or use tooling that provides an ESM loader for `.vue` files.

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
