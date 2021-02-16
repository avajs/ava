const test = require('ava');

test('foo', t => {
	if (process.env.TEMPLATE) {
		t.snapshot({foo: 'one'});
	}

	t.pass();
});

test('bar', t => {
	t.snapshot({bar: 'one'});
});
