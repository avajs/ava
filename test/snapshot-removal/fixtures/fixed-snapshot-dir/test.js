const test = require(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

if (process.env.TEMPLATE) {
	test('some snapshots', t => {
		t.snapshot('foo');
		t.snapshot('bar');
		t.pass();
	});

	test('another snapshot', t => {
		t.snapshot('baz');
		t.pass();
	});
} else {
	test('some snapshots', t => {
		t.pass();
	});

	test('another snapshot', t => {
		t.pass();
	});
}
