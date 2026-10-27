import './guard-environment.js'; // eslint-disable-line import-x/no-unassigned-import

import assert from 'node:assert';

import {flags, refs} from './state.js';

assert.ok(refs.runnerChain); // eslint-disable-line unicorn/no-top-level-side-effects

flags.loadedMain = true;

export default refs.runnerChain;
