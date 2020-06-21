const test = require('ava');

test('always failing snapshot', t => {
	t.snapshot(Date.now());
});

test.only('exclusive test', t => { // eslint-disable-line ava/no-only-test
	t.pass();
});

