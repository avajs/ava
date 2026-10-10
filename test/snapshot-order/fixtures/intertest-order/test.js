import test from 'ava';

const reverse = process.env.INTERTEST_ORDER_REVERSE;

// Promises with triggerable resolution
const {promise: one, resolve: resolveOne} = Promise.withResolvers();
const {promise: two, resolve: resolveTwo} = Promise.withResolvers();

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
