const test = require('ava');

const id = index => `index: ${index}`;

let resolveDelay;
const delay = new Promise(resolve => {
	resolveDelay = resolve;
});

test('B - declared first, resolves second', async t => {
	await delay;
	t.snapshot(id(1));
});

test('A - declared second, resolves first', t => {
	t.snapshot(id(2));
	resolveDelay();
});

test('D - a new test, declared third', t => {
	t.snapshot(id(3));
});

test('C - another new test, declared fourth', t => {
	t.snapshot(id(4));
});
