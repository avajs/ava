const test = require(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('foo', t => {
	(process.env.TEMPLATE ? t.snapshot : t.snapshot.skip)({foo: 'one'});
	t.snapshot({foo: 'two'});
});
