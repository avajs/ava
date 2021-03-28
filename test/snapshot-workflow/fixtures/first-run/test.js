const test = require(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('foo', t => {
	t.snapshot({foo: 'one'});
});

test('bar', t => {
	t.pass();
});

test('baz', t => {
	t.snapshot({baz: 'one'}, 'a message');
	t.snapshot({baz: 'two'});
});
