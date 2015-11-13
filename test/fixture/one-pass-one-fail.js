const test = require('../../');

test('this is a passing test', t => {
	t.ok(true);
	t.end();
});

test('this is a failing test', t => {
	t.ok(false);
	t.end();
});
