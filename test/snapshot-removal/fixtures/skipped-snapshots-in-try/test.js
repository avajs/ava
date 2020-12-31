const test = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.

if (process.env.TEMPLATE) {
	test('skipped snapshots in try', async t => {
		const attempt = await t.try(tt => {
			tt.snapshot('in try');
		});

		attempt.commit();

		t.pass();
	});
} else {
	test('skipped snapshots in try', async t => {
		const attempt = await t.try(tt => {
			tt.snapshot.skip('in try');
		});

		attempt.discard();

		t.pass();
	});
}
