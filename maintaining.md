# Maintaining [![Dependency Status](https://david-dm.org/avajs/ava.svg)](https://david-dm.org/avajs/ava) [![devDependency Status](https://david-dm.org/avajs/ava/dev-status.svg)](https://david-dm.org/avajs/ava#info=devDependencies)


## Conduct

**Be kind to everyone.**
Read and adhere to the [Code of Conduct](code-of-conduct.md).


## Testing

 - `npm test`: Lint the code and run the entire test suite with coverage.
 - `npm run test-win`: Run the tests on Windows.
 - `tap test/fork.js --bail`: Run a specific test file and bail on the first failure (useful when hunting bugs).


## Release process

- Bump dependencies.
- Ensure [Travis CI](https://travis-ci.org/avajs/ava) and [AppVeyor](https://ci.appveyor.com/project/avajs/ava/branch/master) are green.
- Publish a new version using [`np`](https://github.com/sindresorhus/np) with a version number according to [semver](http://semver.org).
- Write a [release note](https://github.com/avajs/ava/releases/new) following the style of previous release notes.


## Pull requests

- New features should come with tests and documentation.
- Ensure the [contributing guidelines](contributing.md) are followed.
- At least one team member must `LGTM` a pull request before it's merged.
- Squash commits when merging. *[Example](https://github.com/avajs/ava/commit/0675d3444da6958b54c7e5eada91034e516bc97c)*


## Issue labels

Add labels when triaging issues:

* `babel`: Use this when the issue relates to our Babel infrastructure
* `blocked`: Use this when the issue is blocked. Please leave a comment or edit the issue description with what is blocking the issue
* `bug`: Use this for AVA bugs
* `DO NOT MERGE`: Use this for exploratory pull requests that must not be merged
* `docs`: Use this to track documentation improvements
* `enhancement`: Use this for feature requests
* `good for beginner`: Use this for issues that are good for beginners
* `help wanted`: Use this for issues where we'd really love help from people outside the core team
* `performance`: Use this for performance related issues
* `question`: Use this for issues that are in a discussion phase

Please note the priority labels:

* `priority`: Issues to tackle as soon as possible
* `low priority`: Issues we'd like to see progress on
* `future`: Issues we're not planning on getting to anytime soon. These are the long term suggestions for which we're unlikely to accept PRs

Use the `assigned` label when somebody is working on the issue so we can avoid duplicated effort.

## Profiling

You should first install [`iron-node`](https://github.com/s-a/iron-node) and / or [`devtool`](https://github.com/Jam3/devtool) globally:

```
$ npm install --global iron-node devtool
```

In the root of a project using AVA, run:

```
$ iron-node node_modules/ava/profile.js <test-file>
```

Or:

```
$ devtool node_modules/ava/profile.js <test-file>
```

Once the Dev Tools window has loaded, activate Memory or CPU profiling, and then hit <kbd>Cmd</kbd> <kbd>R</kbd> to rerun the tests.

As soon as the tests finish, stop the recording and inspect the profiler results. The flamegraph can be displayed by choosing `Chart` from the drop down on the `Profiles` tab (other views include `Tree (top down)` and `Heavy (bottom up)`).

You may also want to check out the Settings page in Dev Tools and enable one or more options in the Profiling section.

##### Helpful resources

 - [An introduction to Node.js debugging with `devtool`](http://mattdesl.svbtle.com/debugging-nodejs-in-chrome-devtools).
 - [A video introduction to Chrome DevTools CPU and Memory profiling](https://www.youtube.com/watch?v=KKwmdTByxLk).


## Benchmarking

First collect benchmark data for a branch/commit:

```
$ node bench/run
```

Once you have collected data from two/three branches/commits:

```
$ node bench/compare
```

*You could for example gather benchmark data from the working tree and the last commit.*

![](https://cloud.githubusercontent.com/assets/4082216/12700805/bf18f730-c7bf-11e5-8a4f-fec0993c053f.png)

You can now launch a subset of the suite:

```
$ node bench/run.js concurrent/sync.js serial/sync.js -- concurrent/sync.js -- serial/sync.js
```

Note the `--` separator. The above would be the same as benchmarking all three of the following commands.

```
$ ava concurrent/sync.js serial/sync.js
$ ava concurrent/sync.js
$ ava serial/sync.js
```

Also if you are benchmarking a suite that should fail, you must add the `--should-fail` flag in that group:

```
$ node bench/run.js concurrent/sync.js -- --should-fail other/failures.js
```

The above benchmarks two commands, but expects the second one to fail.


## Onboarding new core members

- Add the user to the `readme.md` and `package.json`.
- Add the user as a collaborator to all AVA related repos and npm packages.
- Share the Twitter account login info and encourage to tweet/retweet relevant stuff.
