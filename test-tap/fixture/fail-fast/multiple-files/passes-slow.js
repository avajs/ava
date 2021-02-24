const {workerData} = require('worker_threads');
const pEvent = require('p-event');
const test = require('../../../..');

test.serial('first pass', async t => {
	t.pass();
	const timer = setTimeout(() => {}, 60000); // Ensure process stays alive.
	const source = (workerData && workerData.port) ? workerData.port : process;
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
