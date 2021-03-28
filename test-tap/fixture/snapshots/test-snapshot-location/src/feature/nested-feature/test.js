const test = require('../../../../../../../entrypoints/main.cjs');

test('test nested feature title', t => {
	t.snapshot({foo: 'bar'});

	t.snapshot({answer: 42});
});

test('another nested feature test', t => {
	t.snapshot(new Map());
});
