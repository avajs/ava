import test from 'ava';

test('timeout with a synchronous test', t => {
	t.timeout(10);
	const start = Date.now();
	while (Date.now() < start + 15) {
		// Busy-wait to block the event loop
	}

	t.pass();
});
