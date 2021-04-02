const test = require(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('foo', t => {
	if (process.env.TEMPLATE) {
		t.snapshot({foo: 'one'});
	}

	t.pass();
});

test('bar', t => {
	t.snapshot({bar: 'one'});
});
