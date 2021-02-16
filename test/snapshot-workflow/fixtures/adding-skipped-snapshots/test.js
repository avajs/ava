const test = require('ava');

test('foo', t => {
	t.snapshot({foo: 'one'});

	if (!process.env.TEMPLATE) {
		t.snapshot.skip({foo: 'two'}); // eslint-disable-line ava/no-skip-assert
		t.snapshot({foo: 'three'});
	}
});
