const test = require('ava');

test('fail', t => {
	t.log(Date.now());
	t.fail();
});
