const test = require('ava');

test('always failing snapshot', t => {
	t.snapshot(Date.now());
});

test.skip('skipped test', t => { // eslint-disable-line ava/no-skip-test
	t.pass();
});

