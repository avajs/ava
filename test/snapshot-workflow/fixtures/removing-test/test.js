const test = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('foo', t => {
	t.snapshot({foo: 'one'});
});

if (process.env.TEMPLATE) {
	test('bar', t => {
		t.snapshot({bar: 'one'});
	});
}
