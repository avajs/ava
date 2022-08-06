import test from 'ava';

test('good', t => {
	t.pass();
});

test('process.exit', async t => {
	t.pass();
	await new Promise(resolve => {
		setImmediate(resolve);
	});
	process.exit(0); // eslint-disable-line unicorn/no-process-exit
});

test('still good', t => {
	t.pass();
});
