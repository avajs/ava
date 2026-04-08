import test from '../../../entrypoints/main.js';

import './dep-1.js'; // eslint-disable-line import-x/no-unassigned-import
import './dep-2.js'; // eslint-disable-line import-x/no-unassigned-import
import './dep-3.custom'; // eslint-disable-line import-x/no-unassigned-import

test('hey ho', t => {
	t.fail();
});
