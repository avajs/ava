const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

if (process.env.TEMPLATE) {
	test('first test', t => {
		t.snapshot({foo: 'bar'});
	});

	test('second test', t => {
		t.snapshot({bar: 'baz'});
	});
} else {
	test('second test', t => {
		t.snapshot({bar: 'baz'});
	});

	test('first test', t => {
		t.snapshot({foo: 'bar'});
	});
}
