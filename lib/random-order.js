/* eslint-disable no-bitwise -- The PRNG below operates on 32-bit integers. */
import crypto from 'node:crypto';

export const MAX_SEED = (2 ** 32) - 1;

export const generateSeed = () => crypto.randomInt(MAX_SEED + 1);

// Mulberry32, a small PRNG with a 32-bit state. Its statistical quality is
// irrelevant here, but it must be deterministic across platforms and versions
// so that a seed can be replayed.
const createRandom = seed => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6D_2B_79_F5) >>> 0;
		let value = Math.imul(state ^ (state >>> 15), state | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / (2 ** 32);
	};
};

// Fisher-Yates shuffle, seeded so the resulting order can be reproduced.
export const shuffleFiles = (files, seed) => {
	const random = createRandom(seed);
	const shuffled = [...files];
	for (let index = shuffled.length - 1; index > 0; index--) {
		const swapWith = Math.floor(random() * (index + 1));
		[shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]];
	}

	return shuffled;
};
