const test = require('ava');

test('always failing snapshot', t => {
	t.snapshot(Date.now());
});

test('skipped assertion', t => {
	t.snapshot.skip(Date.now()); // eslint-disable-line ava/no-skip-assert
	t.pass();
});
