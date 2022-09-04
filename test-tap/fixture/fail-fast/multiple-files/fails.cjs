const test = require('../../../../entrypoints/main.cjs');

// Allow some time for all workers to launch.
const grace = new Promise(resolve => {
	setTimeout(resolve, 500);
});

test('first pass', t => {
	t.pass();
});

test('second fail', async t => {
	await grace;
	t.fail();
});

test('third pass', async t => {
	await grace;
	t.pass();
});
