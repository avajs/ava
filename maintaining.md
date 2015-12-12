# Maintaining


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
