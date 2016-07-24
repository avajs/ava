The following features are considered "Experimental", in that their exact behavior is not yet considered locked. In general, we want to keep these features around long term (they are unlikely to disappear completely), but significant breaking changes are fair game until we are confident in the implementation. For core features, we generally try to accompany any breaking changes with codemods to ease the pain of upgrading, but users should not expect the same for experimental features.

Our recommendation is to go ahead and use these features *if* they provide significant benefits to your build.

# Limited Concurrency

Enabled via a CLI flag (`--concurrency=5`) or via the `ava` section of `package.json` (`concurrency:5`).

This will limit the number of test files spawned concurrently during the test run. The default is unlimited, and will cause all test files to be spawned at once. This can overload some systems if there are many, many test files. Especially on CI machines. Use the concurrency config to limit the number of processes. You may need to experiment to determine the optimal number of processes.

## Caveats

Use of `test.only` does not work correctly when concurrency is limited. We think this is a solvable problem.

## Stability

Fixing the `test.only` bug is the main barrier to this becoming a stable core feature. It's proven invaluable to many users, so we aren't likely to remove it unless some significantly better solution is discovered.

We believe limited concurrency is valuable enough to eventually become the default. We would love your help determining what the default concurrency limit should be (See [#966](https://github.com/avajs/ava/issues/966)).


# Precompiling Sources

AVA already precompiles your *test* files in the main process. This removes the need for loading `babel-register` in every child process just to compile the test. This has significant performance benefits. Unfortunately, this does not help users who want to write their project *source* files using the latest language features, as they often still need to use the `--require=babel-register` flag.

Enabled via a CLI flag (`--precompile`) or via the `ava` section of `packages.json` (`precompile:true`), this feature will cause AVA to precompile all required sources via Babel in the main process before launching the child process. If you use this feature, you **must** remove `--require=babel-register` from your config to see any benefits.

## Caveats

It does not work with relative requires. You must use strings in your require statements, expressions will not work. This is very similar to the restrictions imposed by packagers like `browserify`. If you need to make relative requires, you must still use `babel-register`, so this is unlikely to be helpful.

It only works with Babel 6. We still need to find a solution for typescript users.

## Stability

This is a fairly new feature, and the details may change significantly. Initial tests indicate some very significant performance increases over `babel-register`. It is possible that `babel-register` could be further optimized with more a more aggressive caching mechanism that would obviate the need for this feature. As long as it proves to provide significant performance benefits, it is likely this feature will stick around in one way or another.
