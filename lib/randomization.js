const maximumSeed = 2_147_483_647;

export const generateSeed = () => Math.floor(Math.random() * maximumSeed);

export function validateSeed(value) {
	const seed = Number(value);
	if (!Number.isSafeInteger(seed) || seed < 0) {
		throw new TypeError('The --seed flag must be provided with a non-negative integer.');
	}

	return seed;
}

export function deriveSeed(seed, salt) {
	let hash = seed % maximumSeed;
	for (const character of salt) {
		hash = ((hash * 31) + character.codePointAt(0)) % maximumSeed;
	}

	return hash === 0 ? 1 : hash;
}

function createRandom(seed) {
	let state = seed % maximumSeed;
	if (state <= 0) {
		state += maximumSeed - 1;
	}

	return () => {
		state = (state * 16_807) % maximumSeed;
		return (state - 1) / (maximumSeed - 1);
	};
}

export function shuffle(items, seed) {
	const random = createRandom(seed);
	const shuffled = [...items];

	for (let index = shuffled.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(random() * (index + 1));
		[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
	}

	return shuffled;
}
