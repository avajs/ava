import foo from 'nested/foo'; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved
import bar from 'the-path/bar'; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved
import test from '../../';

test('relative require', t => {
	t.is(foo, 'bar');
	t.is(bar, 'baz');
});
