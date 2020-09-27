const test = require('ava');

test('timeout with invalid message', t => {
	t.timeout(10, 20);
});

