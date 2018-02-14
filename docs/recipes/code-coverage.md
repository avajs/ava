# Code coverage

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/code-coverage.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/code-coverage.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/code-coverage.md), [日本語](https://github.com/avajs/ava-docs/blob/master/ja_JP/docs/recipes/code-coverage.md), [Português](https://github.com/avajs/ava-docs/blob/master/pt_BR/docs/recipes/code-coverage.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/code-coverage.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/code-coverage.md)

Use the [nyc] command-line-client for [Istanbul] to compute the code coverage of your tests.

First install [nyc]:

```
$ npm install --save-dev nyc
```

At its simplest run AVA through [nyc]. In your `package.json` file:

```json
{
	"scripts": {
		"test": "nyc ava"
	}
}
```

You may want to exclude the `.nyc_output` and `coverage` directories from source control. Assuming you're using Git, add the following to your `.gitignore` file:

```
.nyc_output
coverage
```

If you're compiling your source files using Babel you may want to apply Istanbul's instrumentation as part of the source file compilation. This will yield better results than instrumenting Babel's output. See Istanbul's [*Using Istanbul With ES2015+* tutorial](https://istanbul.js.org/docs/tutorials/es2015/). AVA sets `NODE_ENV=test` for you. Note that as of February 2018 this tutorial hasn't yet been updated for Babel 7.

[Istanbul]: https://istanbul.js.org/
[nyc]: https://github.com/istanbuljs/nyc
