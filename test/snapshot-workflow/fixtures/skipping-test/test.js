const test = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.

(process.env.TEMPLATE ? test : test.skip)('foo', t => {
	t.snapshot({foo: 'one'});
});

test('bar', t => {
	t.snapshot({bar: 'one'});
});
