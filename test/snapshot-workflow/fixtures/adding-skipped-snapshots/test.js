const test = require('ava');

test('foo', t => {
	t.snapshot({foo: 'one'});

	if (!process.env.TEMPLATE) {
		t.snapshot.skip({foo: 'two'});
		t.snapshot.skip({foo: 'three'});
		t.snapshot({foo: 'four'});
	}
});
