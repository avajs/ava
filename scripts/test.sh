#!/bin/bash
set -ex

npx xo
npx tsc --noEmit
npx c8 --report=none test-ava
npx c8 --report=none --no-clean tap
npx c8 report
