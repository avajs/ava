import crypto from 'node:crypto';

// Derive a well-distributed 32-bit unsigned integer from an arbitrary seed
// string. FNV-1a over the UTF-8 bytes, followed by an avalanche mix so that
// seeds differing by even a single character yield unrelated starting states.
function deriveState(seed) {
	let hash = 0x811c9dc5;
	const bytes = new TextEncoder().encode(String(seed));
	for (const byte of bytes) {
		hash ^= byte;
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}

	hash ^= hash >>> 15;
	hash = Math.imul(hash, 0x2c1b3c6d) >>> 0;
	hash ^= hash >>> 12;

	return hash >>> 0;
}

// xorshift32 — a tiny, fast PRNG with a full 2**32 - 1 period and good
// distribution. Seeded from a 32-bit state it produces a deterministic stream
// of floats in [0, 1), which is what makes `--seed` reproducible.
function createRng(seedState) {
	let state = seedState >>> 0;
	if (state === 0) {
		state = 0x9e3779b9;
	}

	return () => {
		state ^= state << 13;
		state >>>= 0;
		state ^= state >> 17;
		state ^= state << 5;
		state >>>= 0;
		return (state >>> 0) / 0x100000000;
	};
}

export function generateSeed() {
	return crypto.randomBytes(8).toString('hex');
}

export function fileOrderSeed(seed) {
	return `files:${seed}`;
}

export function testOrderSeed(seed, file) {
	return `tests:${seed}:${file}`;
}

// Deterministic Fisher-Yates shuffle driven by a seed-derived PRNG. The same
// (seed, salt) pair always yields the same permutation, which is what makes
// `--seed` reproducible across machines and runs.
export function shuffle(items, seed) {
	const shuffled = [...items];
	const next = createRng(deriveState(seed));

	for (let index = shuffled.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(next() * (index + 1));
		[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
	}

	return shuffled;
}
