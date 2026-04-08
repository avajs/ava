import test from 'ava';

import required from './required.js';

test('default export is called', t => {
	t.true(required.called);
});
