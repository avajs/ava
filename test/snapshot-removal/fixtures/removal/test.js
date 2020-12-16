/* eslint-disable capitalized-comments, ava/no-identical-title */

if (process.env.TEMPLATE) {
	const test = require('ava');

	test('some snapshots', t => {
		t.snapshot('foo');
		t.snapshot('bar');
		t.pass();
	});

	test('another snapshot', t => {
		t.snapshot('baz');
		t.pass();
	});
} else {
	const test = require('ava');

	test('some snapshots', t => {
		// t.snapshot('foo');
		// t.snapshot('bar');
		t.pass();
	});

	test('another snapshot', t => {
		// t.snapshot('baz');
		t.pass();
	});
}
