# Code coverage

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/code-coverage.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/code-coverage.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/code-coverage.md), [日本語](https://github.com/avajs/ava-docs/blob/master/ja_JP/docs/recipes/code-coverage.md), [Português](https://github.com/avajs/ava-docs/blob/master/pt_BR/docs/recipes/code-coverage.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/code-coverage.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/code-coverage.md)

Use [`nyc`] to compute the code coverage of your tests.

First install [`nyc`]:

```
$ npm install --save-dev nyc
```

At its simplest run AVA through [`nyc`]. In your `package.json` file:

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

[`nyc`]: https://github.com/istanbuljs/nyc
