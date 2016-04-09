# Configuring Babel

Translations: [Français](https://github.com/sindresorhus/ava-docs/blob/master/fr_FR/docs/recipes/babelrc.md)

There are multiple options for configuring how AVA transpiles your tests using Babel.

 - [AVA's default transpiler behavior](#avas-default-transpiler-behavior)
 - [Customizing how AVA transpiles your tests](#customizing-how-ava-transpiles-your-tests)
 - [Transpiling Sources](#transpiling-sources)
 - [Transpiling tests and sources the same way](#transpiling-tests-and-sources-the-same-way)
 - [Extend your source transpilation configuration](#extend-your-source-transpilation-configuration)
 - [Extend an alternate config file (i.e. not `.babelrc`)](#extend-an-alternate-config-file)
 - [Notes](#notes)

## AVA's default transpiler behavior

By default, AVA transpiles your tests (and only your tests) using Babels [`es2015`](http://babeljs.io/docs/plugins/preset-es2015/) and [`stage-2`](http://babeljs.io/docs/plugins/preset-stage-2/) presets. This is a great option for small modules where you do not desire a build step to transpile your source before deploying to `npm`.

## Customizing how AVA transpiles your tests

You can override the default Babel configuration AVA uses for test transpilation in `package.json`. For example, the configuration below adds the Babel `rewire` plugin, and opts to only use the Babel [`stage-3`](http://babeljs.io/docs/plugins/preset-stage-3/) preset (which is a subset of [`stage-2`]((http://babeljs.io/docs/plugins/preset-stage-2/))).

```json
{
  "ava": {
    "babel": {
      "plugins": ["rewire"],
      "presets": ["es2015", "stage-3"]
    }
  }
}
```

## Transpiling Sources

To transpile your sources, you will need to define a [`babel config` ](http://babeljs.io/docs/usage/babelrc/) in `package.json` or a `.babelrc` file. Also, you will need to tell AVA to load [`babel-register`](http://babeljs.io/docs/usage/require/) in every forked process, by adding it to the `require` section of your AVA config:

`package.json`

```json
{
  "ava": {
    "require": ["babel-register"]
  },
  "babel": {
    "presets": ["es2015"]
  }
}
```

Note that loading `babel-register` in every forked process has a non-trivial performance cost. If you have lots of test files, you may want to consider using a build step to transpile your sources *before* running your tests. This isn't ideal, since it complicates using AVA's watch mode, so we recommend using `babel-register` until the performance penalty becomes too great. Setting up a precompilation step is out of scope for this document, but we recommend you check out one of the many [build systems that support Babel](http://babeljs.io/docs/setup/). There is an open issue (#577) discussing ways we could make this experience better.

## Transpiling tests and sources the same way

Using the `"inherit"` shortcut will cause your tests to be transpiled the same as your sources (as specified in your [`babelrc`](http://babeljs.io/docs/usage/babelrc/)). Ava will add a few additional [internal plugins](#notes) when transpiling your tests, but they won't affect the behavior of your test code.

`package.json`:

```json
{
  "ava": {
    "require": "babel-register",
    "babel": "inherit"
  }
}
```

## Extend your source transpilation configuration

When specifying the Babel config for your tests, you can set the `babelrc` option to `true`. This will merge the specified plugins with those from your [`babelrc`](http://babeljs.io/docs/usage/babelrc/).

`package.json`:

```json
{
  "ava": {
    "require": "babel-register",
    "babel": {
      "babelrc": true,
      "plugins": ["custom-plugin-name"],
      "presets": ["custom-preset"]
    }
  }
}
```

## Extend an alternate config file.


If, for some reason, your Babel config is not specified in one of the default locations ([`.babelrc` or `package.json`](http://babeljs.io/docs/usage/babelrc/)), you can set the `extends` option to the alternate config you want to use during testing.

`package.json`:

```json
{
  "ava": {
    "require": "babel-register",
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
 * Generate test metadata to determine which files should be run first (*future*).
 * Static analysis of dependencies for precompilation (*future*).
