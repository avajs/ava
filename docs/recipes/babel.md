# Configuring Babel with AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/babel.md)

You can enable Babel support by installing [`@babel/register`](https://babeljs.io/docs/en/babel-register) and `@babel/core`, and then in AVA's configuration requiring `@babel/register`:

**`package.json`:**

```json
{
	"ava": {
		"require": [
			"@babel/register"
		]
	}
}
```

`@babel/register` binds itself to the node's require hook and automatically compiles files on the fly.This will compile both the source and the test files.

For more information visit the [Babel docs](https://babeljs.io/docs/en/babel-register).
