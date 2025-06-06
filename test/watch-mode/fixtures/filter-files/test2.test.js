const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test('emma', t => {
	t.pass();
});

test('frank', async t => {
	t.pass();
});

test('gina', async t => {
	t.pass();
});

test('harry', async t => {
	t.fail();
});
