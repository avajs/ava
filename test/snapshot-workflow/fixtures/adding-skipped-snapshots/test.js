import process from 'node:process';

const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM); // This fixture is copied to a temporary directory, so import AVA through its configured path.

test('foo', t => {
	t.snapshot({foo: 'one'});

	if (process.env.TEMPLATE) {
		return;
	}

	t.snapshot.skip({foo: 'two'});
	t.snapshot({foo: 'three'});
});
