const test = require('ava');

test('commit a skipped snapshot', async t => {
	t.snapshot(1);

	const firstTry = await t.try(t => {
		if (process.env.TEMPLATE) {
			t.snapshot('before');
		} else {
			t.snapshot.skip('after'); // eslint-disable-line ava/no-skip-assert
		}
	});

	firstTry.commit();
});
