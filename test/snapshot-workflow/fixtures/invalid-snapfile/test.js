const test = require(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test('foo', t => {
	t.snapshot.skip({foo: 'one'});
	t.snapshot({foo: 'two'});
});

test('bar', t => {
	t.snapshot({bar: 'one'});
	t.snapshot.skip({bar: 'two'});
});

test.skip('baz', t => {
	t.snapshot({baz: 'one'});
});
