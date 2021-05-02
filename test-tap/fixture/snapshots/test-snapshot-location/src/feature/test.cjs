const test = require('../../../../../../entrypoints/main.cjs');

test('test feature title', t => {
	t.snapshot({foo: 'bar'});

	t.snapshot({answer: 42});
});

test('another feature test', t => {
	t.snapshot(new Map());
});
