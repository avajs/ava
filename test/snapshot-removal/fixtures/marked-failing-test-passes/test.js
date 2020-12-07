/* eslint-disable capitalized-comments, ava/no-identical-title */

const test = require('ava');

if (process.env.TEMPLATE) {
	test('some snapshots', t => {
		t.snapshot('foo');
		t.snapshot('bar');
		t.assert(true);
	});

	test.failing('another snapshot', t => {
		t.snapshot('baz');
		t.assert(false);
	});
} else {
	test('some snapshots', t => {
		// t.snapshot('foo');
		// t.snapshot('bar');
		t.assert(true);
	});

	test.failing('another snapshot', t => {
		// t.snapshot('baz');
		t.assert(true);
	});
}
