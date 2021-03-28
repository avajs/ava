const test = require(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('commit a skipped snapshot', async t => {
	t.snapshot(1);

	const firstTry = await t.try(t => {
		if (process.env.TEMPLATE) {
			t.snapshot('before');
		} else {
			t.snapshot.skip('after');
		}
	});

	firstTry.commit();
});
