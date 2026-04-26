const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test('foo', t => {
	t.snapshot(process.env.TEMPLATE ? {foo: 'one'} : {foo: 'new'});
});

test('bar', t => {
	t.snapshot(process.env.TEMPLATE ? {bar: 'one'} : {bar: 'new'});
});
