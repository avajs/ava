const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

(process.env.TEMPLATE ? test : test.skip)('foo', t => {
	t.snapshot({foo: 'one'});
});

test('bar', t => {
	t.snapshot({bar: 'one'});
});
