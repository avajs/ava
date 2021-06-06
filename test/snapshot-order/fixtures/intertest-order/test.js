import test from 'ava';

const reverse = process.env.INTERTEST_ORDER_REVERSE;

// Functions which resolve the corresponding promise to undefined
let resolveOne;
let resolveTwo;

// Promises with triggerable resolution
const one = new Promise(resolve => {
	resolveOne = resolve;
});

const two = new Promise(resolve => {
	resolveTwo = resolve;
});

// Test cases which await the triggerable promises
test('one', async t => {
	await one;
	t.snapshot('one');
	resolveTwo();
});
test('two', async t => {
	await two;
	t.snapshot('two');
	resolveOne();
});

// Start resolution
if (reverse) {
	resolveTwo();
} else {
	resolveOne();
}
