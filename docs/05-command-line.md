# CLI

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/05-command-line.md)

```console
ava [<pattern>...]
ava debug [<pattern>...]
ava reset-cache

Commands:
  ava [<pattern>...]        Run tests                                  [default]
  ava debug [<pattern>...]  Activate Node.js inspector and run a single test
                            file
  ava reset-cache           Delete any temporary files and state kept by AVA,
                            then exit

Positionals:
  pattern  Select which test files to run. Leave empty if you want AVA to run
           all test files as per your configuration. Accepts glob patterns,
           directories that (recursively) contain test files, and file paths
           optionally suffixed with a colon and comma-separated numbers and/or
           ranges identifying the 1-based line(s) of specific tests to run
                                                                        [string]

Options:
      --version            Show version number                         [boolean]
      --color              Force color output                          [boolean]
      --config             Specific JavaScript file for AVA to read its config
                           from, instead of using package.json or ava.config.*
                           files
      --help               Show help                                   [boolean]
  -c, --concurrency        Max number of test files running at the same time
                           (default: CPU cores)                         [number]
      --fail-fast          Stop after first test failure               [boolean]
  -m, --match              Only run tests with matching title (can be repeated)
                                                                        [string]
      --no-worker-threads  Don't use worker threads                    [boolean]
      --node-arguments     Additional Node.js arguments for launching worker
                           processes (specify as a single string)       [string]
  -s, --serial             Run tests serially                          [boolean]
  -t, --tap                Generate TAP output                         [boolean]
  -T, --timeout            Set global timeout (milliseconds or human-readable,
                           e.g. 10s, 2m)                                [string]
  -u, --update-snapshots   Update snapshots                            [boolean]
  -v, --verbose            Enable verbose output (default)             [boolean]
  -w, --watch              Re-run tests when files change              [boolean]

Examples:
  ava
  ava test.js
  ava test.js:4,7-9
```

AVA searches for test files using the following patterns:

* `test.js`
* `src/test.js`
* `source/test.js`
* `**/test-*.js`
* `**/*.spec.js`
* `**/*.test.js`
* `**/test/**/*.js`
* `**/tests/**/*.js`
* `**/__tests__/**/*.js`

Files inside `node_modules` are *always* ignored. So are files starting with `_` or inside of directories that start with a single `_`. Additionally, files matching these patterns are ignored by default, unless different patterns are configured:

* `**/__tests__/**/__helper__/**/*`
* `**/__tests__/**/__helpers__/**/*`
* `**/__tests__/**/__fixture__/**/*`
* `**/__tests__/**/__fixtures__/**/*`
* `**/test/**/helper/**/*`
* `**/test/**/helpers/**/*`
* `**/test/**/fixture/**/*`
* `**/test/**/fixtures/**/*`
* `**/tests/**/helper/**/*`
* `**/tests/**/helpers/**/*`
* `**/tests/**/fixture/**/*`
* `**/tests/**/fixtures/**/*`

When using `npm test`, you can pass positional arguments directly `npm test test2.js`, but flags needs to be passed like `npm test -- --verbose`.

## Running tests with matching titles

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/matching-titles?file=test.js&terminal=test&view=editor)

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

## Running tests at specific line numbers

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/specific-line-numbers?file=test.js&terminal=test&view=editor)

AVA lets you run tests exclusively by referring to their line numbers. Target a single line, a range of lines or both. You can select any line number of a test.

The format is a comma-separated list of `[X|Y-Z]` where `X`, `Y` and `Z` are integers between `1` and the last line number of the file.

This feature is only available from the command line.

### Running a single test

To only run a particular test in a file, append the line number of the test to the path or pattern passed to AVA.

Given the following test file:

`test.js`

```js
1: test('unicorn', t => {
2:   t.pass();
3: });
4:
5: test('rainbow', t => {
6:  t.fail();
7: });
```

Running `npx ava test.js:2` for would run the `unicorn` test. In fact you could use any line number between `1` and `3`.

### Running multiple tests

To run multiple tests, either target them one by one or select a range of line numbers. As line numbers are given per file, you can run multiple files with different line numbers for each file. If the same file is provided multiple times, line numbers are merged and only run once.

### Examples

Single line numbers:

```console
npx ava test.js:2,9
```

Range:

```console
npx ava test.js:4-7
```

Mix of single line number and range:

```console
npx ava test.js:4,9-12
```

Different files:

```console
npx ava test.js:3 test2.js:4,7-9
```

When running a file with and without line numbers, line numbers take precedence.

## Resetting AVA's cache

AVA maintains some temporary state. You can clear this state by running:

```console
npx ava reset-cache
```

This deletes all files in the `node_modules/.cache/ava` directory.

## Reporters

AVA uses a human readable reporter by default:

<img src="../media/verbose-reporter.png" width="294">

### TAP reporter

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/tap-reporter?file=test.js&terminal=test&view=editor)

AVA supports the TAP format and thus is compatible with [any TAP reporter](https://github.com/sindresorhus/awesome-tap#reporters). Use the `--tap` flag to enable TAP output.

```console
$ npx ava --tap | npx tap-nyan
```

<img src="../media/tap-reporter.png" width="420">

Please note that the TAP reporter is unavailable when using [watch mode](./recipes/watch-mode.md).

## Node arguments

The `--node-arguments` argument may be used to specify additional arguments for launching worker processes. These are combined with the `nodeArguments` configuration and any arguments passed to the `node` binary when starting AVA.

**Only pass trusted values.**

Specify the arguments as a single string:

```console
npx ava --node-arguments="--throw-deprecation --zero-fill-buffers"
```

**Only pass trusted values.**
