import {test} from 'tap';

import {createRandom, shuffle} from '../lib/shuffle.js';

test('createRandom is deterministic for a given seed', t => {
	const first = createRandom(42);
	const second = createRandom(42);
	t.strictSame(
		[first(), first(), first()],
		[second(), second(), second()],
	);
	t.end();
});

test('createRandom returns values between 0 and 1', t => {
	const random = createRandom(1234);
	for (let index = 0; index < 100; index++) {
		const value = random();
		t.ok(value >= 0 && value < 1, `value ${value} is in range`);
	}

	t.end();
});

test('shuffle returns a permutation of the input', t => {
	const input = [1, 2, 3, 4, 5, 6, 7, 8];
	const result = shuffle([...input], createRandom(42));
	t.strictSame(result.toSorted((a, b) => a - b), input);
	t.end();
});

test('shuffle with seed 42 produces the expected order', t => {
	t.strictSame(
		shuffle(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], createRandom(42)),
		['c', 'h', 'b', 'a', 'g', 'f', 'd', 'e'],
	);
	t.end();
});
