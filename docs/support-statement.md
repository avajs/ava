# Supported Node.js versions

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/support-statement.md)

AVA supports the latest release of any major version that [is supported by Node.js itself](https://github.com/nodejs/Release#release-schedule).

*Support* here means that we run our test suite under the given Node.js versions and will accept pull requests to fix any bugs (provided they're not known bugs in Node.js itself that will be fixed imminently). Consequently, *dropping support* means we'll remove those Node.js versions from our test matrix and will no longer accept specific pull requests to fix bugs under those versions.

When we drop support for an LTS-covered major version we will bump AVA's major version number.

We will drop support for odd-numbered Node.js versions (e.g. `11` or `13`) *without* bumping AVA's major version number.

We try to avoid *accidentally* dropping support for non-latest Node.js releases. If such breakage does occur we'll accept pull requests to restore functionality. We might decide to deprecate the offending AVA release and bump AVA's major version number instead.

Whenever we bump AVA's major version number, we *will* explicitly drop support for non-latest Node.js releases. This ensures we can rely on backported APIs or the availability of newer V8 releases in later Node.js versions, either in AVA itself or one of our dependencies.

We may drop support for a Node.js version, in a major-version-bumping-pre-release, if that new AVA version is expected to become stable around or after the end-of-life date of the Node.js version in question.

Experimental features opted into through the `nonSemVerExperiments` configuration may be changed or removed at any time.
