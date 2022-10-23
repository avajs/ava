# Watch mode

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/watch-mode.md), [Italiano](https://github.com/avajs/ava-docs/blob/main/it_IT/docs/recipes/watch-mode.md), [Русский](https://github.com/avajs/ava-docs/blob/main/ru_RU/docs/recipes/watch-mode.md), [简体中文](https://github.com/avajs/ava-docs/blob/main/zh_CN/docs/recipes/watch-mode.md)

AVA comes with an intelligent watch mode. It watches for files to change and runs just those tests that are affected.

## Running tests with watch mode enabled

You can enable watch mode using the `--watch` or `-w` flags:

```console
$ npx ava --watch
```

Please note that integrated debugging and the TAP reporter are unavailable when using watch mode.

## Limitations

AVA uses `fs.watch()`. On supported platforms, `recursive` mode is used. When not supported, `fs.watch()` is used with individual directories, based on the dependency tracking (see below). This is an approximation. `recursive` mode is available with Node.js 19.1 on Linux, MacOS and Windows so we will not attempt to improve our fallback implementation.

## Ignoring changes

By default AVA watches for changes to all files, except for those with a `.snap.md` extension, `ava.config.*` and files in [certain directories](https://github.com/novemberborn/ignore-by-default/blob/master/index.js) as provided by the [`ignore-by-default`] package.

You can configure additional patterns for files to ignore in the [`ava` section of your `package.json`, or `ava.config.*` file][config], using the `ignoredByWatcher` key.

If your tests write to disk they may trigger the watcher to rerun your tests. Configuring additional ignore patterns helps avoid this.

## Dependency tracking

AVA tracks which source files your test files depend on. If you change such a dependency only the test file that depends on it will be rerun. AVA will rerun all tests if it cannot determine which test file depends on the changed source file.

Dependency tracking works for `require()` and `import` syntax, as supported by [@vercel/nft](https://github.com/vercel/nft). `import()` is supported but dynamic paths such as `import(myVariable)` are not. Files accessed using the `fs` module are not tracked.

## Watch mode and the `.only` modifier

The [`.only` modifier] disables watch mode's dependency tracking algorithm. When a change is made, all `.only` tests will be rerun, regardless of whether the test depends on the changed file.

## Watch mode and CI

If you run AVA in your CI with watch mode, the execution will exit with an error (`Error : Watch mode is not available in CI, as it prevents AVA from terminating.`). AVA will not run with the `--watch` (`-w`) option in CI, because CI processes should terminate, and with the `--watch` option, AVA will never terminate.

## Manually rerunning all tests

You can quickly rerun all tests by typing <kbd>r</kbd> on the console, followed by <kbd>Enter</kbd>.

## Updating snapshots

You can update failing snapshots by typing <kbd>u</kbd> on the console, followed by <kbd>Enter</kbd>.

## Debugging

Sometimes watch mode does something surprising like rerunning all tests when you thought only a single test would be run. To see its reasoning you can enable a debug mode. This will work best with the verbose reporter:

```console
$ DEBUG=ava:watcher npx ava --watch
```

## Help us make watch mode better

Watch mode is relatively new and there might be some rough edges. Please [report](https://github.com/avajs/ava/issues) any issues you encounter. Thanks!

[`ignore-by-default`]: https://github.com/novemberborn/ignore-by-default
[`.only` modifier]: ../01-writing-tests.md#running-specific-tests
[config]: ../06-configuration.md
