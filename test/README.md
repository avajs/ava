# Self-hosted tests

This directory contains tests that are run using a stable version of AVA. You can run them using `npx test-ava`.

Tests should be placed in their own directory, grouped by area of responsibility. Use the `exec` helper to launch the AVA version that is in the repository to run tests. Place these in a nested `fixtures` directory. Add a relative dependency in `package.json`. You can then import from `ava`.

Prefer snapshotting the test results.
