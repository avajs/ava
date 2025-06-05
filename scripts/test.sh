#!/bin/bash
set -ex

npx tsc --noEmit
npx c8 --report=none test-ava
npx c8 --report=none --no-clean tap
npx c8 report
exit 0
