import test from '../../../';

import './dep-1';
import './dep-2';
import './dep-3.custom';

test('hey ho', t => {
	t.pass();
});
