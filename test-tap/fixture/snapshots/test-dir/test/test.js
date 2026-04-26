import test from '../../../../../entrypoints/main.js';

test('test title', t => {
	t.snapshot({foo: 'bar'});

	t.snapshot({answer: 42});
});

test('another test', t => {
	t.snapshot(new Map());
});
