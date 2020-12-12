/* eslint-disable capitalized-comments */

const test = require('../../../..');

if (process.env.TEMPLATE) {
	test('test title', t => {
		t.snapshot({foo: 'bar'});

		t.snapshot({answer: 42});

		t.assert(true);
	});

	test('another test', t => {
		t.snapshot(new Map());
	});
} else {
	test('test title', t => {
		// t.snapshot({foo: 'bar'});

		// t.snapshot({answer: 42});

		t.assert(true);
	});

	test('another test', t => {
		// t.snapshot(new Map());

		t.assert(true);
	});
}
