# Code coverage

Translations: [Español](https://github.com/avajs/ava-docs/blob/main/es_ES/docs/recipes/code-coverage.md), [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/code-coverage.md), [Italiano](https://github.com/avajs/ava-docs/blob/main/it_IT/docs/recipes/code-coverage.md), [日本語](https://github.com/avajs/ava-docs/blob/main/ja_JP/docs/recipes/code-coverage.md), [Português](https://github.com/avajs/ava-docs/blob/main/pt_BR/docs/recipes/code-coverage.md), [Русский](https://github.com/avajs/ava-docs/blob/main/ru_RU/docs/recipes/code-coverage.md), [简体中文](https://github.com/avajs/ava-docs/blob/main/zh_CN/docs/recipes/code-coverage.md)

Use [`c8`] to compute the code coverage of your tests.

First install [`c8`]:

```
$ npm install --save-dev c8
```

At its simplest run AVA through [`c8`]. In your `package.json` file:

```json
{
	"scripts": {
		"test": "c8 ava"
	}
}
```

You may want to exclude the `coverage` directory from source control. Assuming you're using Git, add the following to your `.gitignore` file:

```
coverage
```

[`c8`]: https://github.com/bcoe/c8
