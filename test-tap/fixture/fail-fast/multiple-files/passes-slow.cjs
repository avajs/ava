const {parentPort} = require('node:worker_threads');

const test = require('../../../../entrypoints/main.cjs');

test.serial('first pass', async t => {
	t.pass();
	const timer = setTimeout(() => {}, 60_000); // Ensure process stays alive.
	const source = parentPort || process;
	const {pEvent} = await import('p-event');
	await pEvent(source, 'message', message => {
		if (message.ava) {
			return message.ava.type === 'peer-failed';
		}

		return false;
	});
	clearTimeout(timer);
});

test.serial('second pass', t => {
	t.pass();
});

test('third pass', t => {
	t.pass();
});
