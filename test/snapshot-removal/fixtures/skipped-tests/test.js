/* eslint-disable ava/no-skip-test, capitalized-comments, ava/no-identical-title */

if (process.env.TEMPLATE) {
	const test = require('ava');

	test('some snapshots', t => {
		t.snapshot('foo');
		t.snapshot('bar');
		t.assert(true);
	});

	test('another snapshot', t => {
		t.snapshot('baz');
		t.assert(true);
	});
} else {
	const test = require('ava');

	test.skip('some snapshots', t => {
		t.snapshot('foo');
		t.snapshot('bar');
		t.assert(true);
	});

	test('another snapshot', t => {
		// t.snapshot('baz');
		t.assert(true);
	});
}
