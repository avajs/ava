import test from 'ava';

test.before(t => {
	t.snapshot({});
});

test('cannot use snapshot in hook', t => {
	t.pass();
});
