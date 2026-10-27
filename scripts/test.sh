#!/bin/bash
set -ex

pnpm exec xo
pnpm exec tsc --noEmit
pnpm exec c8 --report=none test-ava
pnpm exec c8 --report=none --no-clean tap
pnpm exec c8 report
