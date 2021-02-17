const test = require('ava');

test('discard a skipped snapshot', async t => {
	t.snapshot(1);

	const firstTry = await t.try(t => {
		if (process.env.TEMPLATE) {
			t.snapshot('before (first try)');
		} else {
			t.snapshot.skip('after (first try)'); // eslint-disable-line ava/no-skip-assert
		}
	});

	firstTry.discard();

	const secondTry = await t.try(t => {
		t.snapshot(process.env.TEMPLATE ? 'before (second try)' : 'after (second try)');
	});

	secondTry.commit();
});
