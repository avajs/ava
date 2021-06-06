import test from 'ava';

test.before(async t => {
	await t.try(tt => tt.pass());
});

test('cannot use `t.try()` in hook', t => {
	t.pass();
});
