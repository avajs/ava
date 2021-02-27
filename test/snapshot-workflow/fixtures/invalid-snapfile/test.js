const test = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.

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
