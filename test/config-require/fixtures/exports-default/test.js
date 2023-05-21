import test from 'ava';

import required from './required.cjs';

test('exports.default is called', t => {
	t.true(required.called);
});
