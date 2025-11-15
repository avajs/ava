import test from 'ava';

test('commit after discard throws', async t => {
	const attempt = await t.try(tt => {
		tt.pass();
	});

	attempt.discard();
	attempt.commit();
});

test('discard after commit throws', async t => {
	const attempt = await t.try(tt => {
		tt.pass();
	});

	attempt.commit();
	attempt.discard();
});
