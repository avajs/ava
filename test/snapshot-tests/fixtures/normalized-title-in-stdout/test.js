const test = require(process.env.TEST_AVA_IMPORT_FROM);

test(`a rather wordy test title that is wrapped
			to  meet  line  length  requirements   in
			an unconventional way  that may interfere
			with   report   formatting               `, t => {
	t.pass();
});

test('test\r\n\ttitle', Object.assign(t => {
	t.pass();
}, {
	title: title => title,
}));

test('multiline try assertion title', async t => {
	const firstTry = await t.try(`try assertions
																can have titles too`, tt => tt.pass());
	firstTry.commit();
	t.log(firstTry.title);
});
