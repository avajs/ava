import foo from 'nested/foo';
import bar from 'path/bar';
import test from '../../';

test('relative require', t => {
	t.is(foo, 'bar');
	t.is(bar, 'baz');
});
