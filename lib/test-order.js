import crypto from 'node:crypto';

export function generateSeed() {
	return crypto.randomBytes(8).toString('hex');
}

export function fileOrderSeed(seed) {
	return `files:${seed}`;
}

export function testOrderSeed(seed, file) {
	return `tests:${seed}:${file}`;
}

const modulus = 2_147_483_647;
const multiplier = 48_271;

function createRandom(seed) {
	let state = 1;

	for (const character of seed) {
		state = ((state * 31) + character.codePointAt(0)) % modulus;
	}

	if (state === 0) {
		state = 1;
	}

	return () => {
		state = (state * multiplier) % modulus;
		return (state - 1) / (modulus - 1);
	};
}

export function shuffle(items, seed) {
	const shuffled = [...items];
	const random = createRandom(seed);

	for (let index = shuffled.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(random() * (index + 1));
		[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
	}

	return shuffled;
}
