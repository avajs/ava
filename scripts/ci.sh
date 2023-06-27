#!/bin/bash
set -ex

TEST_AVA_SKIP_WATCH_MODE=1 npx c8 --report=none npx test-ava
# Reduce concurrency and be generous with timeouts to give watch mode tests a
# better chance of succeeding in a CI environment.
npx c8 --report=none --no-clean npx test-ava --serial --timeout 30s test/watch-mode
npx c8 --report=none --no-clean npx tap
npx c8 report
