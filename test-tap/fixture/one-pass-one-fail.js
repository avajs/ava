const test = require('../..');

test('this is a passing test', t => {
	t.pass();
});

test('this is a failing test', t => {
	t.fail();
});
