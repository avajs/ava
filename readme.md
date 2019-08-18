# <img src="media/header.png" title="AVA" alt="AVA logo" width="530">

[![Build Status](https://travis-ci.org/avajs/ava.svg?branch=master)](https://travis-ci.org/avajs/ava)  [![Coverage Status](https://codecov.io/gh/avajs/ava/branch/master/graph/badge.svg)](https://codecov.io/gh/avajs/ava/branch/master) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo) [![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/ava)
[![Mentioned in Awesome Node.js](https://awesome.re/mentioned-badge.svg)](https://github.com/sindresorhus/awesome-nodejs)

Testing can be a drag. AVA helps you get it done. AVA is a test runner for Node.js with a concise API, detailed error output, embrace of new language features and process isolation that let you write tests more effectively. So you can ship more awesome code. 🚀

Follow the [AVA Twitter account](https://twitter.com/ava__js) for updates.

Read our [contributing guide](contributing.md) if you're looking to contribute (issues / PRs / etc).

![](media/mini-reporter.gif)


Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/readme.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/readme.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/readme.md), [日本語](https://github.com/avajs/ava-docs/blob/master/ja_JP/readme.md), [한국어](https://github.com/avajs/ava-docs/blob/master/ko_KR/readme.md), [Português](https://github.com/avajs/ava-docs/blob/master/pt_BR/readme.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/readme.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/readme.md)


## Why AVA?

- Minimal and fast
- Simple test syntax
- Runs tests concurrently
- Enforces writing atomic tests
- No implicit globals
- Includes TypeScript definitions
- [Magic assert](#magic-assert)
- [Isolated environment for each test file](./docs/01-writing-tests.md#process-isolation)
- [Write your tests using the latest JavaScript syntax](#latest-javascript-support)
- [Promise support](./docs/01-writing-tests.md#promise-support)
- [Async function support](./docs/01-writing-tests.md#async-function-support)
- [Observable support](./docs/01-writing-tests.md#observable-support)
- [Enhanced assertion messages](./docs/03-assertions.md#enhanced-assertion-messages)
- [Automatic parallel test runs in CI](#parallel-runs-in-ci)
- [TAP reporter](./docs/05-command-line.md#tap-reporter)


## Usage

To install and set up AVA, run:

```console
npm init ava
```

Your `package.json` will then look like this (exact version notwithstanding):

```json
{
	"name": "awesome-package",
	"scripts": {
		"test": "ava"
	},
	"devDependencies": {
		"ava": "^1.0.0"
	}
}
```

Or if you prefer using Yarn:

```console
yarn add ava --dev
```

Alternatively you can install `ava` manually:

```console
npm install --save-dev ava
```

Don't forget to configure the `test` script in your `package.json` as per above.

### Create your test file

Create a file named `test.js` in the project root directory:

```js
import test from 'ava';

test('foo', t => {
	t.pass();
});

test('bar', async t => {
	const bar = Promise.resolve('bar');
	t.is(await bar, 'bar');
});
```

### Running your tests

```console
npm test
```

Or with `npx`:

```console
npx ava
```

Run with the `--watch` flag to enable AVA's [watch mode](docs/recipes/watch-mode.md):

```console
npx ava --watch
```

## Supported Node.js versions

AVA supports the latest release of any major version that [is supported by Node.js itself](https://github.com/nodejs/Release#release-schedule). Read more in our [support statement](docs/support-statement.md).

## Highlights

### Magic assert

AVA adds code excerpts and clean diffs for actual and expected values. If values in the assertion are objects or arrays, only a diff is displayed, to remove the noise and focus on the problem. The diff is syntax-highlighted too! If you are comparing strings, both single and multi line, AVA displays a different kind of output, highlighting the added or missing characters.

![](media/magic-assert-combined.png)

### Clean stack traces

AVA automatically removes unrelated lines in stack traces, allowing you to find the source of an error much faster, as seen above.

### Latest JavaScript support

AVA uses [Babel 7](https://babeljs.io) so you can use the latest JavaScript syntax in your tests. There is no extra setup required. You don't need to be using Babel in your own project for this to work either.

We aim to support all [finished syntax proposals](https://github.com/tc39/proposals/blob/master/finished-proposals.md), as well as all syntax from ratified JavaScript versions (e.g. ES2017). See our [`@ava/stage-4`](https://github.com/avajs/babel-preset-stage-4) preset for the currently supported proposals.

Please note that we do not add or modify built-ins. For example, if you use [`Object.fromEntries()`](https://github.com/tc39/proposal-object-from-entries) in your tests, they will crash in Node.js 10 which does not implement this method.

You can disable this syntax support, or otherwise customize AVA's Babel pipeline. See our [Babel recipe] for more details.

### Parallel runs in CI

AVA automatically detects whether your CI environment supports parallel builds. Each build will run a subset of all test files, while still making sure all tests get executed. See the [`ci-parallel-vars`](https://www.npmjs.com/package/ci-parallel-vars) package for a list of supported CI environments.

## Documentation

Please see the [files in the `docs` directory](./docs):

* [Writing tests](./docs/01-writing-tests.md)
* [Execution context](./docs/02-execution-context.md)
* [Assertions](./docs/03-assertions.md)
* [Snapshot testing](./docs/04-snapshot-testing.md)
* [Command line (CLI)](./docs/05-command-line.md)
* [Configuration](./docs/06-configuration.md)
* [Test timeouts](./docs/07-test-timeouts.md)

### Common pitfalls

We have a growing list of [common pitfalls](docs/08-common-pitfalls.md) you may experience while using AVA. If you encounter any issues you think are common, comment in [this issue](https://github.com/avajs/ava/issues/404).

### Recipes

- [Test setup](docs/recipes/test-setup.md)
- [Code coverage](docs/recipes/code-coverage.md)
- [Watch mode](docs/recipes/watch-mode.md)
- [Endpoint testing](docs/recipes/endpoint-testing.md)
- [When to use `t.plan()`](docs/recipes/when-to-use-plan.md)
- [Browser testing](docs/recipes/browser-testing.md)
- [TypeScript](docs/recipes/typescript.md)
- [Flow](docs/recipes/flow.md)
- [Configuring Babel][Babel recipe]
- [Using ES modules](docs/recipes/es-modules.md)
- [Passing arguments to your test files](docs/recipes/passing-arguments-to-your-test-files.md)
- [Testing React components](docs/recipes/react.md)
- [Testing Vue.js components](docs/recipes/vue.md)
- [JSPM and SystemJS](docs/recipes/jspm-systemjs.md)
- [Debugging tests with Chrome DevTools](docs/recipes/debugging-with-chrome-devtools.md)
- [Debugging tests with VSCode](docs/recipes/debugging-with-vscode.md)
- [Debugging tests with WebStorm](docs/recipes/debugging-with-webstorm.md)
- [Isolated MongoDB integration tests](docs/recipes/isolated-mongodb-integration-tests.md)
- [Testing web apps using Puppeteer](docs/recipes/puppeteer.md)

## FAQ

### Why not `mocha`, `tape`, `tap`?

Mocha requires you to use implicit globals like `describe` and `it` with the default interface (which most people use). It's not very opinionated and executes tests serially without process isolation, making it slow.

Tape and tap are pretty good. AVA is highly inspired by their syntax. They too execute tests serially. Their default [TAP](https://testanything.org) output isn't very user-friendly though so you always end up using an external tap reporter.

In contrast AVA is highly opinionated and runs tests concurrently, with a separate process for each test file. Its default reporter is easy on the eyes and yet AVA still supports TAP output through a CLI flag.

### How is the name written and pronounced?

AVA, not Ava or ava. Pronounced [`/ˈeɪvə/`](media/pronunciation.m4a?raw=true): Ay (f**a**ce, m**a**de) V (**v**ie, ha**v**e) A (comm**a**, **a**go)

### What is the header background?

It's the [Andromeda galaxy](https://simple.wikipedia.org/wiki/Andromeda_galaxy).

### What is the difference between concurrency and parallelism?

[Concurrency is not parallelism. It enables parallelism.](https://stackoverflow.com/q/1050222)

## Support

- [Stack Overflow](https://stackoverflow.com/questions/tagged/ava)
- [Spectrum](https://spectrum.chat/ava)
- [Twitter](https://twitter.com/ava__js)

## Related

- [eslint-plugin-ava](https://github.com/avajs/eslint-plugin-ava) - Lint rules for AVA tests
- [sublime-ava](https://github.com/avajs/sublime-ava) - Snippets for AVA tests
- [atom-ava](https://github.com/avajs/atom-ava) - Snippets for AVA tests
- [vscode-ava](https://github.com/samverschueren/vscode-ava) - Snippets for AVA tests
- [gulp-ava](https://github.com/avajs/gulp-ava) - Run tests with gulp
- [grunt-ava](https://github.com/avajs/grunt-ava) - Run tests with grunt
- [More…](https://github.com/avajs/awesome-ava#packages)

## Links

- [AVA stickers, t-shirts, etc](https://www.redbubble.com/people/sindresorhus/works/30330590-ava-logo)
- [Awesome list](https://github.com/avajs/awesome-ava)
- [AVA Casts](http://avacasts.com)
- [More…](https://github.com/avajs/awesome-ava)

## Team

[![Mark Wubben](https://github.com/novemberborn.png?size=100)](https://github.com/novemberborn) | [![Sindre Sorhus](https://github.com/sindresorhus.png?size=100)](https://github.com/sindresorhus) | [![Vadim Demedes](https://github.com/vadimdemedes.png?size=100)](https://github.com/vadimdemedes)
---|---|---
[Mark Wubben](https://novemberborn.net) | [Sindre Sorhus](http://sindresorhus.com) | [Vadim Demedes](https://github.com/vadimdemedes)

###### Former

- [Kevin Mårtensson](https://github.com/kevva)
- [James Talmage](https://github.com/jamestalmage)
- [Juan Soto](https://github.com/sotojuan)
- [Jeroen Engels](https://github.com/jfmengels)


<div align="center">
	<br>
	<br>
	<br>
	<a href="https://ava.li">
		<img src="media/logo.svg" width="200" alt="AVA">
	</a>
	<br>
	<br>
</div>

[Babel recipe]: docs/recipes/babel.md
