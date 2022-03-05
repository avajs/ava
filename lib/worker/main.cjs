'use strict';

Object.defineProperty(exports, '__esModule', { value: true });
require('./guard-environment.cjs'); // eslint-disable-line import/no-unassigned-import

const assert = require('assert');

const {flags, refs} = require('./state.cjs');

assert(refs.runnerChain);

flags.loadedMain = true;

exports.test = refs.runnerChain; // Default import pattern const { test } = require('ava')
exports["default"] = refs.runnerChain; // works under nodejs  (allowSyntacticImports) esModule Interop const test = require('ava')
// module.exports === exports after require!
