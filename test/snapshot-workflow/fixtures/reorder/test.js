const test = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.

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
