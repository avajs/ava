#!/bin/bash
set -ex

npx xo
npx tsc --noEmit
npx c8 --report=none npx test-ava
npx c8 --report=none --no-clean npx tap
npx c8 report
