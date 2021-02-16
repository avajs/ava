const test = require('ava');

test('foo', t => {
	t.snapshot({foo: 'one'});
});

test('bar', t => {
	t.pass();
});

test('baz', t => {
	t.snapshot({baz: 'one'}, 'a message');
	t.snapshot({baz: 'two'});
});
