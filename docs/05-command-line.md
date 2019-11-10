# CLI

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/05-command-line.md)

```console
$ npx ava --help

  Usage
    ava [<file> ...]

  Options
    --watch, -w             Re-run tests when tests and source files change
    --match, -m             Only run tests with matching title (Can be repeated)
    --update-snapshots, -u  Update snapshots
    --fail-fast             Stop after first test failure
    --timeout, -T           Set global timeout (milliseconds or human-readable, e.g. 10s, 2m)
    --serial, -s            Run tests serially
    --concurrency, -c       Max number of test files running at the same time (Default: CPU cores)
    --verbose, -v           Enable verbose output
    --tap, -t               Generate TAP output
    --color                 Force color output
    --no-color              Disable color output
    --reset-cache           Reset AVA's compilation cache and exit
    --node-arguments        Configure Node.js arguments used to launch worker processes
    --config                JavaScript file for AVA to read its config from, instead of using package.json
                            or ava.config.js files

  Examples
    ava
    ava test.js test2.js
    ava test-*.js
    ava test

  The above relies on your shell expanding the glob patterns.
  Without arguments, AVA uses the following patterns:
    **/test.js **/test-*.js **/*.spec.js **/*.test.js **/test/**/*.js **/tests/**/*.js **/__tests__/**/*.js
```

*Note that the CLI will use your local install of AVA when available, even when run globally.*

AVA searches for test files using the following patterns:

* `**/test.js`
* `**/test-*.js`
* `**/*.spec.js`
* `**/*.test.js`
* `**/test/**/*.js`
* `**/tests/**/*.js`
* `**/__tests__/**/*.js`

Files inside `node_modules` are *always* ignored. So are files starting with `_`. These are treated as helpers.

When using `npm test`, you can pass positional arguments directly `npm test test2.js`, but flags needs to be passed like `npm test -- --verbose`.

## Running tests with matching titles

The `--match` flag allows you to run just the tests that have a matching title. This is achieved with simple wildcard patterns. Patterns are case insensitive. See [`matcher`](https://github.com/sindresorhus/matcher) for more details.

Match titles ending with `foo`:

```console
npx ava --match='*foo'
```

Match titles starting with `foo`:

```console
npx ava --match='foo*'
```

Match titles containing `foo`:

```console
npx ava --match='*foo*'
```

Match titles that are *exactly* `foo` (albeit case insensitively):

```console
npx ava --match='foo'
```

Match titles not containing `foo`:

```console
npx ava --match='!*foo*'
```

Match titles starting with `foo` and ending with `bar`:

```console
npx ava --match='foo*bar'
```

Match titles starting with `foo` or ending with `bar`:

```console
npx ava --match='foo*' --match='*bar'
```

Note that a match pattern takes precedence over the `.only` modifier. Only tests with an explicit title are matched. Tests without titles or whose title is derived from the implementation function will be skipped when `--match` is used.

Here's what happens when you run AVA with a match pattern of `*oo*` and the following tests:

```js
test('foo will run', t => {
	t.pass();
});

test('moo will also run', t => {
	t.pass();
});

test.only('boo will run but not exclusively', t => {
	t.pass();
});

// Won't run, no title
test(function (t) {
	t.fail();
});

// Won't run, no explicit title
test(function foo(t) {
	t.fail();
});
```

## Resetting AVA's cache

AVA caches the compiled test and helper files. It automatically recompiles these files when you change them. AVA tries its best to detect changes to your Babel configuration files, plugins and presets. If it seems like your latest Babel configuration isn't being applied, however, you can run AVA with the `--reset-cache` flag to reset AVA's cache. If set, all files in the `node_modules/.cache/ava` directory are deleted. Run AVA as normal to apply your new Babel configuration.

## Reporters

By default AVA uses a minimal reporter:

<img src="../media/mini-reporter.gif" width="460">

Use the `--verbose` flag to enable the verbose reporter. This is always used in CI environments unless the [TAP reporter](#tap-reporter) is enabled.

<img src="../media/verbose-reporter.png" width="294">

### TAP reporter

AVA supports the TAP format and thus is compatible with [any TAP reporter](https://github.com/sindresorhus/awesome-tap#reporters). Use the `--tap` flag to enable TAP output.

```console
$ npx ava --tap | npx tap-nyan
```

<img src="../media/tap-reporter.png" width="420">

Please note that the TAP reporter is unavailable when using [watch mode](./recipes/watch-mode.md).
