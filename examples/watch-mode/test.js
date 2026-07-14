import test from 'ava';

// Run this example with: `npx ava --watch examples/watch-mode/test.js`

test('live reload', t => {
	const value = 2 + 2;
	t.is(value, 4);
});

