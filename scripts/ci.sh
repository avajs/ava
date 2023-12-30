#!/bin/bash
set -ex

# Set environment variable to have the AVA config skip wathch mode tests.
TEST_AVA_SKIP_WATCH_MODE=1 npx c8 --report=none npx test-ava

# Reduce concurrency and be generous with timeouts to give watch mode tests a
# better chance of succeeding in a CI environment.
npx c8 --report=none --no-clean npx test-ava --serial --timeout 30s test/watch-mode

# Only run reporter tests on Linux where they're least likely to flake out.
case "$(uname -s)" in
    Linux*)     npx c8 --report=none --no-clean npx tap;;
    *)          npx c8 --report=none --no-clean npx tap --exclude="test-tap/reporters/{default,tap}.js"
esac

npx c8 report
