# Maintaining

## Conduct

**Be kind to everyone.** Read and adhere to the [Code of Conduct](code-of-conduct.md).

## Testing

* `npm test`: Lint the code and run the entire test suite with coverage.
* `npx tap test/fork.js --bail`: Run a specific test file and bail on the first failure (useful when hunting bugs).

## CI

* Tests sometimes fail on Windows. Review the errors carefully.
* At least one Windows job must pass.
* All other jobs must pass.

## Updating dependencies

* Make sure new dependency versions are compatible with our supported Node.js versions.
* Leave the TypeScript dependency as it is, to avoid accidental breakage.
* Open a PR with the updates and only merge when CI passes (see the previous section).

## Updating TypeScript

TypeScript itself does not follow SemVer. Consequently we may have to make changes to the type definition that, technically, are breaking changes for users with an older TypeScript version. That's OK, but we should be aware.

Only update the TypeScript dependency when truly necessary. This helps avoid accidental breakage. For instance we won't accidentally rely on newer TypeScript features.

Speaking of, using newer TypeScript features could be considered a breaking change. This needs to be assessed on a case-by-case basis.

## Pull requests

* New features should come with tests and documentation.
* Ensure the [contributing guidelines](contributing.md) are followed.
* Squash commits when merging.

## Experiments

* Implement breaking changes as an experiment first, requiring opt-in.
* Ship new features early by treating them as an experiment, requiring opt-in.

## Release process

* Update dependencies (see the previous section).
* If [necessary](docs/support-statement.md), update the `engines` field in `package.json`.
	* Remove unsupported (or soon to be) Node.js versions.
	* When doing a major version bump, make sure to require the latest releases of each supported Node.js version.
* Publish a new version using [`np`](https://github.com/sindresorhus/np) with a version number according to [SemVer](http://semver.org).
* Write a [release note](https://github.com/avajs/ava/releases/new) following the style of previous release notes.
