const test = require('../../../entrypoints/main.cjs');

require('./dep-1.js'); // eslint-disable-line import-x/no-unassigned-import
require('./dep-2.js'); // eslint-disable-line import-x/no-unassigned-import
require('./dep-3.custom'); // eslint-disable-line import-x/no-unassigned-import

test('hey ho', t => {
	t.pass();
});

setImmediate(() => {
	throw new Error('oops');
});
