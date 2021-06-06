const test = require('../../entrypoints/main.cjs');

test('test', t => t.is(global.foo, 'bar'));
