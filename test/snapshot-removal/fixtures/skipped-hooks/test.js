/* eslint-disable capitalized-comments, ava/no-identical-title, no-unused-vars, ava/no-skip-test */

if (process.env.TEMPLATE) {
	const test = require('ava');

	test.afterEach.always(t => {
		t.snapshot('Hello, world!');
	});

	test('some snapshots', t => {
		t.snapshot('foo');
		t.snapshot('bar');
		t.assert(true);
	});
} else {
	const test = require('ava');

	test.afterEach.always.skip(t => {
		// t.snapshot('Hello, world!');
	});

	test('some snapshots', t => {
		// t.snapshot('foo');
		// t.snapshot('bar');
		t.assert(true);
	});
}
