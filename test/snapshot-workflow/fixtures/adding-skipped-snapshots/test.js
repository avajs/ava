const test = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('foo', t => {
	t.snapshot({foo: 'one'});

	if (!process.env.TEMPLATE) {
		t.snapshot.skip({foo: 'two'});
		t.snapshot({foo: 'three'});
	}
});
