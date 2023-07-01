# Watch mode

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/watch-mode.md), [Italiano](https://github.com/avajs/ava-docs/blob/main/it_IT/docs/recipes/watch-mode.md), [Русский](https://github.com/avajs/ava-docs/blob/main/ru_RU/docs/recipes/watch-mode.md), [简体中文](https://github.com/avajs/ava-docs/blob/main/zh_CN/docs/recipes/watch-mode.md)

AVA comes with an intelligent watch mode. It watches for files to change and runs just those tests that are affected.

AVA 6 is introducing a new watch mode that relies on recurse file watching in Node.js. To use the old watch mode, set the implementation to `ava5+chokidar` and install [`chokidar`] alongside AVA:

`ava.config.mjs`:
```js
export default {
	watchMode: {
		implementation: 'ava5+chokidar',
	},
}
```

## Running tests with watch mode enabled

You can enable watch mode using the `--watch` or `-w` flags:

```console
$ npx ava --watch
```

Please note that integrated debugging and the TAP reporter are unavailable when using watch mode.

## Requirements

AVA 5 uses [`chokidar`] as the file watcher. Note that even if you see warnings about optional dependencies failing during install, it will still work fine. Please refer to the *[Install Troubleshooting]* section of `chokidar` documentation for how to resolve the installation problems with chokidar.

The same applies with AVA 6 when using the `ava5+chokidar` watcher. However you'll need to install `chokidar` separately.

Otherwise, AVA 6 uses `fs.watch()`. Support for `recursive` mode is required. Note that this has only become available on Linux since Node.js 20. [Other caveats apply](https://nodejs.org/api/fs.html#caveats), for example this won't work well on network filesystems and Docker host mounts.

## Ignoring changes

By default AVA watches for changes to all files, except for those with a `.snap.md` extension, `ava.config.*` and files in [certain directories](https://github.com/novemberborn/ignore-by-default/blob/master/index.js) as provided by the [`ignore-by-default`] package.

With AVA 5, you can configure additional patterns for files to ignore in the [`ava` section of your `package.json`, or `ava.config.*` file][config], using the `ignoredByWatcher` key.

With AVA 6, place these patterns within the `watchMode` object:

```js
export default {
	watchMode: {
		ignoreChanges: ['coverage'],
	},
};
```

If your tests write to disk they may trigger the watcher to rerun your tests. Configuring additional ignore patterns helps avoid this.

## Dependency tracking

AVA tracks which source files your test files depend on. If you change such a dependency only the test file that depends on it will be rerun. AVA will rerun all tests if it cannot determine which test file depends on the changed source file.

AVA 5 (and the `ava5+chokidar` watcher in AVA 6) spies on `require()` calls to track dependencies. Custom extensions and transpilers are supported, provided you [added them in your `package.json` or `ava.config.*` file][config], and not from inside your test file.

With AVA 6, dependency tracking works for `require()` and `import` syntax, as supported by [@vercel/nft](https://github.com/vercel/nft). `import()` is supported but dynamic paths such as `import(myVariable)` are not.

Files accessed using the `fs` module are not tracked.

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

[`chokidar`]: https://github.com/paulmillr/chokidar
[Install Troubleshooting]: https://github.com/paulmillr/chokidar#install-troubleshooting
[`ignore-by-default`]: https://github.com/novemberborn/ignore-by-default
[`.only` modifier]: ../01-writing-tests.md#running-specific-tests
[config]: ../06-configuration.md
