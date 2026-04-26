import test from '../../../../../entrypoints/main.js';

test('test title', t => {
	t.snapshot({foo: 'bar'});
});
