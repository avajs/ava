const test = require('../../../../entrypoints/main.cjs');

test.only('only', t => t.pass());

test('passes', t => t.pass());
