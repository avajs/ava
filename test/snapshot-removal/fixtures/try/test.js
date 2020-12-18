const test = require(process.env.AVA_PATH || 'ava');

if (process.env.TEMPLATE) {
	test('snapshots in try', async t => {
		const attempt = await t.try(tt => {
			tt.snapshot('in try');
		});

		attempt.commit();

		t.pass();
	});
} else {
	test('snapshots in try', async t => {
		const attempt = await t.try(tt => {
			tt.snapshot('in try');
		});

		attempt.discard();

		t.pass();
	});
}
