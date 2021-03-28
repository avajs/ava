const test = require('../../../entrypoints/main.cjs');

require('./dep-1'); // eslint-disable-line import/no-unassigned-import
require('./dep-2'); // eslint-disable-line import/no-unassigned-import
require('./dep-3.custom'); // eslint-disable-line import/no-unassigned-import

test('hey ho', t => {
	t.fail();
});
