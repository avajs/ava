# Improving language support

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/specs/001%20-%20Improving%20language%20support.md)

An [RFC](http://blog.npmjs.org/post/153881413635/some-notes-on-rfcs) with a proposal for improving AVA's support for Babel, React and TypeScript projects.

## Problem statement

Integrating AVA with Babel-based projects is overly cumbersome. Users need to configure `babel-core/register` in order for helper and source files to be compiled. Configuring how test files are compiled is confusing. Source files may [need a different configuration when loaded in AVA][source options reason] than when built for distribution.

There is no support for writing tests and sources in other languages such as TypeScript or JSX.

## Background

AVA uses Babel to enable users to write tests using [ES2015](https://babeljs.io/docs/plugins/preset-es2015/) and [stage-2](https://babeljs.io/docs/plugins/preset-stage-2/) proposals. Assertion messages are [enhanced using a Babel plugin](https://github.com/avajs/ava/pull/46), and another plugin is used to [detect improper usage of `t.throws()`](https://github.com/avajs/ava/pull/742).

Initially `babel/register` was [used directly](https://github.com/avajs/ava/pull/23), and applied to test, helper and source files alike. Shortly after this was changed so only [test files were transpiled](https://github.com/avajs/ava/issues/50). The former behavior was [considered a bug](https://github.com/avajs/ava/issues/108#issuecomment-151245367), presumably because it made AVA compile source files against the user's intent.

Subsequently users were [advised to add `babel-core/register` to the list of modules automatically required when running tests](https://github.com/avajs/ava#transpiling-imported-modules). Turns out that loading Babel in each process is quite slow, and attempts were made to compile [helper][1078] and [source][945] files in the main AVA process instead.

Meanwhile AVA had moved away from using `babel/register` and instead was using Babel directly. A [cache implementation](https://github.com/avajs/ava/pull/352) was layered on top.

AVA's only ever looked for test files with a `.js` extension, even if glob patterns explicitly matched other files. By definition this prevents [JSX and TypeScript files from being selected](https://github.com/avajs/ava/issues/631).

## Possible solutions

[#945][945] attempts to compile all test file dependencies (both helper and source files) in the main process. Aside from unresolved issues, one big drawback is that it cannot handle dynamic requires, since they occur in the worker processes rather than the main process. Scanning for dependencies adds its own overhead.

[#1078][1078] precompiles helper files in the main process, like how test files are precompiled. This should work reasonably well, but is of course limited to compiling helper files.

The [conclusion of #631][631 conclusion] was to allow different test file extensions to be specified. Unfortunately merely allowing other extensions is insufficient. AVA will still assume test files contain just JavaScript. It won't be able to run JSX or TypeScript.

[#1122](https://github.com/avajs/ava/pull/1122) builds on the [proposal in #631][631 conclusion] by detecting whether the `.ts` extension is configured and automatically compiling such test files using TypeScript. Unfortunately it's not clear how this would work for source files without running into the same performance issues we already see with Babel. The TypeScript test files won't get enhanced assertions or protection against improper `t.throws()` usage either. It's hard to communicate this to users when the way TypeScript support is enabled is to specify an `extensions` option.

## Specific proposal

By default AVA compiles test and helper files. It uses Babel, but only with plugins for stage-4 proposals and ratified standards (currently that's ES2016 plus the proposals that have reached stage-4 and will be included in ES2017). This means AVA supports the same syntax as ESLint.

AVA no longer applies [`babel-plugin-transform-runtime`](https://babeljs.io/docs/plugins/transform-runtime/). This plugin aliases ES2015 globals which is unnecessary, since we're now targeting Node.js 4. This is a [known pitfall](https://github.com/avajs/ava/issues/1089).

AVA's other transforms, such as `babel-plugin-espower` and `babel-plugin-ava-throws-helper`, will be bundled into a `babel-preset-ava` preset that is automatically applied. (If necessary we could add an option to apply `babel-plugin-transform-runtime` along with the [rewrite logic](https://github.com/avajs/ava/blob/033d4dcdcbdadbf665c740ff450c2a775a8373dc/lib/babel-config.js#L53:L61) we apply to fix the paths. We should take a wait-and-see approach on this though.)

### Babel projects

The above assumes AVA is used with regular JavaScript projects that do not require compilation. Many users though already have a Babel pipeline in place and wish to use AVA without having to precompile their source files.

At its simplest, setting `"babel": true` in the AVA configuration enables AVA's support for Babel projects. Test and helper files are compiled as per the above, but source files are now automatically compiled as well.

AVA looks at either the project's `package.json` or `.babelrc` files for the Babel options used to compile source files (ideally we can extract a proper Babel configuration object from these two locations). This is a simplification of Babel's actual configuration management, which searches for the options file that is closest to the file being compiled. Looking at these two specific files allows AVA to use cached compilation results without even having to load Babel, while still recompiling source files if options change.

AVA's handling of Babel projects can be further configured by passing an options object instead of `true`:

* `compileSources: true | false`: defaulting to `true`, determines whether sources are compiled.
* `extensions: "js" | ["js", "jsx", ...]`: defaulting to `"js"`, specifies the allowed file extensions. This expands the default test file patterns.
* `sourceOptions: {}`: specify the [Babel options] used to compile source files. In this context `babelrc: true` causes options to be merged with those found in either the project's `package.json` or `.babelrc` files. `babelrc` defaults to `true`.
* `testOptions: {}`: specify the [Babel options] used to compile test and helper files. If provided this completely disables the default Babel configuration AVA uses to compile test and helper files. Like with `sourceOptions`, `babelrc` defaults to `true`. Set `presets: ["ava"]` to apply AVA's transforms.

`sourceOptions` can be used to extend a shared Babel configuration so that the source files can be loaded in AVA tests. For instance users may [rely on webpack to resolve ES2015 module syntax at build time, but still need to apply `babel-plugin-transform-es2015-modules-commonjs` for sources to work in AVA][source options reason].

`sourceOptions` and `testOptions`, being [Babel options], may specify `ignore` and `only` values. These are only used to determine whether the file needs compilation. They do not impact test file selection or source watching.

## Compilation

Based on this [proof of concept](https://github.com/avajs/ava/pull/1082) Babel compilation is moved into the test workers. If source files are to be compiled AVA will load its own require hook, rather than relying on `babel-core/register`.

Babel options for test, helper and source files are prepared in the main process, and then shared with the workers. Caching hashes are derived from these configurations as well as other dependencies that might be involved.

Workers hash the raw file contents and inspect a cache to see if a previously compiled result can be used. (Given that workers can run concurrently, care must be taken to ensure that they read complete cache entries. It's OK though if the same file is compiled more than once.)

## TypeScript projects

TypeScript support can be provided in much the same way as the advanced Babel support described above. Setting `"typescript": true` in the AVA config enables TypeScript support for `.ts` test and helper files, as well as sources. An options object can also be provided:

* `compileSources: true | false`: defaulting to `true`, determines whether sources are compiled.
* `extensions: "ts" | ["ts", "tsx", ...]`: defaulting to `"ts"`, specifies the allowed file extensions. This expands the default test file patterns.
* `sourceOptions: {}`: specify the [TypeScript options] used to compile source files. The `extends` option defaults to the project's `tsconfig.json` file, if any. It must explicitly be set to `null` to avoid extending this file.
* `testOptions: {}`: specify the [TypeScript options] used to compile test and helper files. Behaves the same as `sourceOptions`, there is no default configuration for test and helper files, unlike with Babel projects.

For `sourceOptions` and `testOptions`, being [TypeScript options], `files`, `include` and `exclude` options do not impact test file selection or source watching.

## Further implementation details

Both Babel and TypeScript support can be provided through separate Node.js modules. They should implement the same interface, to make integration with AVA easier.

AVA ships with Babel support, however a separate dependency needs to be installed to make TypeScript support work. A helpful error is logged if this dependency is missing while TypeScript support is enabled.

AVA selects test files based on the combined `babel` and `typescript` configuration.

Relative paths in `sourceOptions` and `testOptions` [must be resolved relative to the `package.json` file](https://github.com/avajs/ava/issues/707).

[1078]: https://github.com/avajs/ava/pull/1078
[631 conclusion]: https://github.com/avajs/ava/issues/631#issuecomment-248659780
[945]: https://github.com/avajs/ava/pull/945
[Babel options]: https://babeljs.io/docs/usage/api/#options
[source options reason]: https://github.com/avajs/ava/issues/1139#issuecomment-267969417
[TypeScript options]: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
