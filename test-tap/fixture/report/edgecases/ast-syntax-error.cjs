const test = require('../../../../entrypoints/main.cjs');

// Define the test function directly
const fn = t => {
  t.pass();
};

// Use the test function in the test definition
test('fn', fn);
