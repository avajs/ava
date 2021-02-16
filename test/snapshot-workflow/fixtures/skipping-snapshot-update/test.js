const test = require('ava');

test('foo', t => {
	if (process.env.TEMPLATE) {
		t.snapshot({foo: 'one'});
		t.snapshot({foo: 'two'});
	} else {
		t.snapshot.skip({one: 'something new'}); // eslint-disable-line ava/no-skip-assert
		t.snapshot({two: 'something new'});
	}
});
