# Maintaining [![Dependency Status](https://david-dm.org/sindresorhus/ava.svg)](https://david-dm.org/sindresorhus/ava) [![devDependency Status](https://david-dm.org/sindresorhus/ava/dev-status.svg)](https://david-dm.org/sindresorhus/ava#info=devDependencies)


## Testing

 - `npm test`: Lint the code and run the entire test suite with coverage.
 - `npm run test-win`: Run the tests on Windows.
 - `npm run coverage`: Generate a coverage report for the last test run (opens a browser window).
 - `tap test/fork.js --bail`: Run a specific test file and bail on the first failure (useful when hunting bugs).


## Release process

- Bump dependencies.
- Ensure [Travis CI](https://travis-ci.org/sindresorhus/ava) and [AppVeyor](https://ci.appveyor.com/project/sindresorhus/ava/branch/master) are green.
- Publish a new version using [`np`](https://github.com/sindresorhus/np) with a version number according to [semver](http://semver.org).
- Write a [release note](https://github.com/sindresorhus/ava/releases/new) following the style of previous release notes.


## Pull requests

- New features should come with tests and documentation.
- Ensure the [contributing guidelines](contributing.md) are followed.
- At least two team members must `LGTM` a pull request before it's merged.
- Squash commits when merging.


## Profiling

You should first install [`iron-node`](https://github.com/s-a/iron-node) and / or [`devtool`](https://github.com/Jam3/devtool) globally:

```
$ npm install --global iron-node
$ npm install --global devtool
```

In the root of a project using AVA, run:

```
$ iron-node node_modules/ava/profile.js <test-file>
# or
$ devtool node_modules/ava/profile.js <test-file>
```

Once the Dev Tools window has loaded, activate Memory or CPU profiling, and then hit <kbd>Cmd</kbd> <kbd>R</kbd> to rerun the tests.

As soon as the tests finish, stop the recording and inspect the profiler results. The flame chart can be displayed by choosing `Chart` from the drop down on the `Profiles` tab (other views include `Tree (top down)` and `Heavy (bottom up)`).

You may also want to check out the Settings page in Dev Tools and enable one or more options in the Profiling section.

Helpful Resources:

 - [An introduction to Node.js debugging with `devtool`](http://mattdesl.svbtle.com/debugging-nodejs-in-chrome-devtools).
 - [A video introduction to Chrome DevTools CPU and Memory profiling](https://www.youtube.com/watch?v=KKwmdTByxLk).
