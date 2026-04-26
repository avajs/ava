# Configuring Babel with AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/babel.md)

AVA is ESM-only. [`@babel/register`](https://babeljs.io/docs/en/babel-register) only hooks legacy `require()` loading, so this setup is no longer supported.

If you need Babel, precompile your files before running AVA or use an ESM-capable loader configured through [`nodeArguments`](../06-configuration.md#node-arguments).
