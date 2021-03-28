const test = require('../../../../entrypoints/main.cjs');

const fn = do {
  t => t.pass();
};

test('fn', fn);
