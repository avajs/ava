# Snapshot workflow tests

These tests simulate various situations that may arise in the process of writing and maintaining snapshot-based tests.

Most of these tests consist of a fixture containing test files that can be run in two ways (with or without `TEMPLATE=true`) to simulate a user making a change to their tests. Most fixtures also contain some initial snapshot state. The fixture is copied to a temporary directory AVA is invoked. The test then asserts that the snapshots were changed in the expected manner.

## Updating test fixture snapshots

When changes are made to the snapshot file format or to the fixtures themselves, it may be necessary to update the fixtures' initial states. To do this, pass `--update-fixture-snapshots` to the tests:

```
npx test-ava test/snapshot-workflow/** -- --update-fixture-snapshots
```

## Invariants

1. All tests that use a fixture must initialize it in the same manner. Otherwise, they would overwrite eachothers' expected initial states.
    - Typically, initialization is done by the equivalent of running `TEMPLATE=true npx ava --update-snapshots` in the fixture directory.
    - Tests that require different initialization can set up their initial state _after_ copying the fixture to a temporary directory.

## Serial execution

Many tests in this suite are declared with `test.serial()`. This is typically done to spare CI machines the burden of many parallel `AVA` invocations, rather than because of shared dependencies.
