const test = require('ava');

test('foo', t => {
	t.snapshot({foo: 'one'}, process.env.TEMPLATE ? undefined : 'a new message');
});
