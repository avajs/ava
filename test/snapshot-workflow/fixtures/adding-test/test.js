const test = require('ava');

test('foo', t => {
	t.snapshot({foo: 'one'});
});

if (!process.env.TEMPLATE) {
	test('bar', t => {
		t.snapshot({bar: 'one'});
	});
}
