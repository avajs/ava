# Configuring Babel

Translations: [Français](https://github.com/sindresorhus/ava-docs/blob/master/fr_FR/docs/recipes/babelrc.md)

There are multiple options for configuring how AVA transpiles your tests using Babel.

 - [Specify a complete config in `package.json`](#specify-a-complete-config-in-packagejson)
 - [Extend existing `.babelrc` without modification](#extend-existing-babelrc-without-modification)
 - [Extend existing `.babelrc` with additional plugins or presets](#extend-existing-babelrc-with-additional-plugins-or-presets)
 - [Extend an alternate config file (i.e. not `.babelrc`)](#extend-alternate-config-file)
 - [Notes](#notes)

## Specify a complete config in `package.json`

The `babelrc` option defaults to `false`, meaning `.babelrc` files are not considered when transpiling tests. This means you must specify your complete config in `package.json`.

```json
{
  "ava": {
    "babel": {
      "plugins": ["rewire"],
      "presets": ["es2015"]
    }
  }
}
```

## Extend existing `.babelrc` without modification

Use the `"inherit"` shortcut if you want your tests transpiled the same as your sources. This will use your `.babelrc` directly (with a few additional [internal plugins](#notes)).

`package.json`:

```json
{
 "ava": {
   "babel": "inherit"
 }
}
```

## Extend existing `.babelrc` with additional plugins or presets

Set `babelrc` to `true`. This will use your `.babelrc` and extend it with any additional plugins specified.

`package.json`:

```json
{
  "ava": {
    "babel": {
      "babelrc": true,
      "plugins": ["custom-plugin-name"],
      "presets": ["custom-preset"]
    }
  }
}
```

## Extend alternate config file.


If, for some reason, you do not want to extend `.babelrc`, set the `extends` option to the alternate config you want to use during testing.

`package.json`:

```json
{
  "ava": {
    "babel": {
      "extends": "./babel-test-config.json",
      "plugins": ["custom-plugin-name"],
      "presets": ["custom-preset"]
    }
  }
}
```

The above uses `babel-test-config.json` as the base config, and extends it with the custom plugins and presets specified.

## Notes

AVA *always* adds a few custom Babel plugins when transpiling your plugins. They serve a variety of functions:

 * Enable `power-assert` support.
 * Rewrite require paths internal AVA dependencies like `babel-runtime` (important if you are still using `npm@2`).
 * [`ava-throws-helper`](https://github.com/jamestalmage/babel-plugin-ava-throws-helper) helps AVA [detect and report](https://github.com/sindresorhus/ava/pull/742) improper use of the `t.throws` assertion.
 * Generate test metadata to determine which files should be run first (*future*).
 * Static analysis of dependencies for precompilation (*future*).
