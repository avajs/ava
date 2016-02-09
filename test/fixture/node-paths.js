import test from '../../';

import foo from 'nested/foo';

test('relative require', t => {
	t.is(foo(), 'bar');
});
