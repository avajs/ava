import test from '../../';

import foo from 'nested/foo';
import bar from 'path/bar';

test('relative require', t => {
	t.is(foo(), 'bar');
	t.is(bar(), 'baz');
});
