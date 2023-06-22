const {setTimeout: delay} = require('node:timers/promises');

const test = require('../../entrypoints/main.cjs');

test('slow', async t => {
	t.log('helpful log of a pending test');
	await delay(5000);
	t.pass();
});

test('fast', t => t.pass());
