import test from 'ava';

test('timeout with console output', async t => {
	t.timeout(5, 'timeout despite console output');
	for (;;) {
		console.log('sorry for the noise');
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
});
