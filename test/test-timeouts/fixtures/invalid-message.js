import test from 'ava';

test('timeout with invalid message', t => {
	t.timeout(10, 20);
});

