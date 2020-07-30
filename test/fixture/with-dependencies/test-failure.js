import test from '../../..';

/* eslint-disable import/no-unassigned-import, import/extensions */
import './dep-1';
import './dep-2';
import './dep-3.custom';
/* eslint-enable import/no-unassigned-import, import/extensions */

test('hey ho', t => {
	t.fail();
});
