import test from '../../entrypoints/main.js';

test('foo', t => {
	t.pass();
});

test.only('bar', t => {
	t.pass();
});

test.only('baz', t => {
	t.pass();
});
