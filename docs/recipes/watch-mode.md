# Watch mode

Translations: [Français](https://github.com/sindresorhus/ava-docs/blob/master/fr_FR/docs/recipes/watch-mode.md), [Italiano](https://github.com/sindresorhus/ava-docs/blob/master/it_IT/recipes/watch-mode.md), [Русский](https://github.com/sindresorhus/ava-docs/blob/master/ru_RU/docs/recipes/watch-mode.md), [简体中文](https://github.com/sindresorhus/ava-docs/blob/master/zh_CN/docs/recipes/watch-mode.md)

AVA comes with an intelligent watch mode. It watches for files to change and runs just those tests that are affected.

## Running tests with watch mode enabled

You can enable watch mode using the `--watch` or `-w` flags. If you have installed AVA globally:

```console
$ ava --watch
```

If you've configured it in your `package.json` like this:

```json
{
  "scripts": {
    "test": "ava"
  }
}
```

You can run:

```console
$ npm test -- --watch
```

You could also set up a special script:

```json
{
  "scripts": {
    "test": "ava",
    "test:watch": "ava --watch"
  }
}
```

And then use:

```console
$ npm run test:watch
```

## Requirements

AVA uses [`chokidar`] as the file watcher. It's configured as an optional dependency since `chokidar` sometimes can't be installed. Watch mode is not available if `chokidar` fails to install, instead you'll see a message like:

> The optional dependency chokidar failed to install and is required for --watch. Chokidar is likely not supported on your platform.

Please refer to the [`chokidar` documentation][`chokidar`] for how to resolve this problem.

## Source files and test files

In AVA there's a distinction between *source files* and *test files*. As you can imagine the *test files* contain your tests. *Source files* are all other files that are needed for the tests to run, be it your source code or test fixtures.

By default AVA watches for changes to the test files, `package.json`, and any other `.js` files. It'll ignore files in [certain directories](https://github.com/novemberborn/ignore-by-default/blob/master/index.js) as provided by the [`ignore-by-default`] package.

You can configure patterns for the source files using the [`--source` CLI flag] or in the `ava` section of your `package.json` file. Note that if you specify a negative pattern the directories from [`ignore-by-default`] will no longer be ignored, so you may want to repeat these in your config.

If your tests write to disk they may trigger the watcher to rerun your tests. If this occurs you will need to use the `--source` flag.

## Dependency tracking

AVA tracks which source files your test files depend on. If you change such a dependency only the test file that depends on it will be rerun. AVA will rerun all tests if it cannot determine which test file depends on the changed source file.

Dependency tracking works for required modules. Custom extensions and transpilers are supported, provided you loaded them using the [`--require` CLI flag] and not from inside your test file. Files accessed using the `fs` module are not tracked.

## Watch mode and the `.only` modifier

The [`.only` modifier] disables watch mode's dependency tracking algorithm. When a change is made, all `.only` tests will be rerun, regardless of whether the test depends on the changed file.

## Manually rerunning all tests

You can quickly rerun all tests by typing <kbd>r</kbd> on the console, followed by <kbd>Enter</kbd>.

## Debugging

Sometimes watch mode does something surprising like rerunning all tests when you thought only a single test would be run. To see its reasoning you can enable a debug mode:

```console
$ DEBUG=ava:watcher npm test -- --watch
```

On Windows use:

```console
$ set DEBUG=ava:watcher
$ npm test -- --watch
```

## Help us make watch mode better

Watch mode is relatively new and there might be some rough edges. Please [report](https://github.com/sindresorhus/ava/issues) any issues you encounter. Thanks!

[`chokidar`]: https://github.com/paulmillr/chokidar
[`ignore-by-default`]: https://github.com/novemberborn/ignore-by-default
[`--require` CLI flag]: https://github.com/sindresorhus/ava#cli
[`--source` CLI flag]: https://github.com/sindresorhus/ava#cli
[`.only` modifier]: https://github.com/sindresorhus/ava#running-specific-tests
