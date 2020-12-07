/* eslint-disable capitalized-comments, ava/no-identical-title, no-unreachable */

const test = require('ava');

if (process.env.TEMPLATE) {
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
	test('some snapshots', t => {
		// t.snapshot('foo');
		// t.snapshot('bar');
		t.assert(true);
	});

	throw new Error('Crashing during test declaration.');

	test('another snapshot', t => {
		// t.snapshot('baz');
		t.assert(true);
	});
}
