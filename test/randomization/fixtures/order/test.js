import fs from 'node:fs';

import test from 'ava';

function record(title) {
	fs.appendFileSync(process.env.ORDER_FILE, `${title}\n`);
}

test.serial('serial one', t => {
	record('serial one');
	t.pass();
});

test.serial('serial two', t => {
	record('serial two');
	t.pass();
});

test('alpha', t => {
	record('alpha');
	t.pass();
});

test('bravo', t => {
	record('bravo');
	t.pass();
});

test('charlie', t => {
	record('charlie');
	t.pass();
});

test('delta', t => {
	record('delta');
	t.pass();
});
