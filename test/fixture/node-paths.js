const foo = require('nested/foo');
const bar = require('the-path/bar');
const test = require('../..');

test('relative require', t => {
	t.is(foo, 'bar');
	t.is(bar, 'baz');
});
