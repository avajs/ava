const test = require('../../../../../entrypoints/main.cjs');

test('test title', t => {
	t.snapshot({foo: 'bar'});
});
