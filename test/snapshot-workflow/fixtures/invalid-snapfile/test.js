const test = require('ava');

test('foo', t => {
	t.snapshot.skip({foo: 'one'}); // eslint-disable-line ava/no-skip-assert
	t.snapshot({foo: 'two'});
});

test('bar', t => {
	t.snapshot({bar: 'one'});
	t.snapshot.skip({bar: 'two'}); // eslint-disable-line ava/no-skip-assert
});

test.skip('baz', t => { // eslint-disable-line ava/no-skip-test
	t.snapshot({baz: 'one'});
});
