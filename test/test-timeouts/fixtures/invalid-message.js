import test from 'ava';

test('timeout with invalid message', t => {
	t.timeout(10, 20); // eslint-disable-line ava/assertion-arguments
});

