'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('can select tests by line numbers', t => {
  execCli([
    'line-numbers.js',
    'line-numbers.js:8',
    'line-numbers.js:7-15',
    'one-pass-one-fail.js:5'
  ], (error, stdout) => {
    t.ifError(error);
    t.match(stdout, /3 tests passed\s+1 test todo/);
    t.end();
  });
});

test('bails when --watch is used while line numbers are given', t => {
  execCli(['--watch', 'line-numbers.js:3'], {env: {CI: ''}}, (error, stdout, stderr) => {
    t.is(error.code, 1);
    t.match(stderr, 'Watch mode is not available when selecting individual line numbers.');
    t.end();
  });
});