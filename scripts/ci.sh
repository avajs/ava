#!/bin/bash
set -ex

# Set environment variable to have the AVA config skip watch mode tests.
TEST_AVA_SKIP_WATCH_MODE=1 pnpm exec c8 --report=none test-ava

# Reduce concurrency to give watch mode tests a better chance of succeeding in
# a CI environment.
pnpm exec c8 --report=none --no-clean test-ava --serial test/watch-mode

# Only run reporter tests on Linux where they're least likely to flake out.
case "$(uname -s)" in
    Linux*)     pnpm exec c8 --report=none --no-clean tap;;
    *)          pnpm exec c8 --report=none --no-clean tap --exclude="test-tap/reporters/{default,tap}.js"
esac

pnpm exec c8 report
