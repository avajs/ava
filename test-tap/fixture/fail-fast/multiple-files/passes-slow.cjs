const events = require('node:events');
const {parentPort} = require('node:worker_threads');

const test = require('../../../../entrypoints/main.cjs');

test.serial('first pass', async t => {
	t.pass();
	const timer = setTimeout(() => {}, 60_000); // Ensure process stays alive.
	const source = parentPort || process;
	for await (const [message] of events.on(source, 'message')) {
		if (message.ava?.type === 'peer-failed') {
			break;
		}
	}

	clearTimeout(timer);
});

test.serial('second pass', t => {
	t.pass();
});

test('third pass', t => {
	t.pass();
});
