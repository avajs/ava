import test from 'ava';

test('foo', t => {
	t.pass();
});

test.only('bar', t => {
	t.pass();
});

test.only(t => {
	t.pass();
});
