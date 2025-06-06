'use strict';
require('./guard-environment.cjs'); // eslint-disable-line import-x/no-unassigned-import

const assert = require('node:assert');

const {flags, refs} = require('./state.cjs');

assert(refs.runnerChain);

flags.loadedMain = true;

module.exports = refs.runnerChain;
