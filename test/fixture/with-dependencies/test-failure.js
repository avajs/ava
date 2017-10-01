import test from '../../../';

import './dep-1'; // eslint-disable-line import/no-unassigned-import
import './dep-2'; // eslint-disable-line import/no-unassigned-import
import './dep-3.custom'; // eslint-disable-line import/no-unassigned-import

test('hey ho', t => {
	t.fail();
});
