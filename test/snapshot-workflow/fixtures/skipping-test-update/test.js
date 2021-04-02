const test = require(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

(process.env.TEMPLATE ? test : test.skip)('foo', t => {
	t.snapshot(process.env.TEMPLATE ? {foo: 'one'} : ['something new']);
});

test('bar', t => {
	t.snapshot(process.env.TEMPLATE ? {bar: 'one'} : ['something new']);
});
