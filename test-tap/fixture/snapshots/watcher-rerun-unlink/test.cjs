const test = require('../../../../entrypoints/main.cjs');

if (process.env.TEMPLATE) {
	test('test title', t => {
		t.snapshot({foo: 'bar'});
		t.snapshot({answer: 42});
		t.pass();
	});

	test('another test', t => {
		t.snapshot(new Map());
	});
} else {
	test('test title', t => {
		t.pass();
	});

	test('another test', t => {
		t.pass();
	});
}
