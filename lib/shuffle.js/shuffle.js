// A seedable PRNG (mulberry32) and a Fisher–Yates shuffle. Used to randomize
// the order in which tests run, in a way that can be reproduced from a seed.
// See the `randomize` option in `runner.js`.

/* eslint-disable no-bitwise -- A PRNG is inherently bitwise. */

export function createRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6D_2B_79_F5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

export function shuffle(array, random) {
	for (let index = array.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(random() * (index + 1));
		const temporary = array[index];
		array[index] = array[swapIndex];
		array[swapIndex] = temporary;
	}

	return array;
}
