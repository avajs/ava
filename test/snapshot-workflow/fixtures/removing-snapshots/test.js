const test = require('ava');

test('foo', t => {
	t.snapshot({foo: 'one'});

	if (process.env.TEMPLATE) {
		t.snapshot({foo: 'two'});
	}
});
