# Configuring Babel with AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/babel.md)

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

`@babel/register` is compatible with CommonJS only. It intercepts `require()` calls and compiles files on the fly. This will compile source, helper and test files.

For more information visit the [Babel documentation](https://babeljs.io/docs/en/babel-register).
