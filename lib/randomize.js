import {randomInt} from 'node:crypto';

const seedUpperBound = 2 ** 32;
const generatorModulus = 2_147_483_647;
const generatorMultiplier = 48_271;

export function createRandomSeed() {
	return randomInt(seedUpperBound);
}

export function isRandomSeed(value) {
	return Number.isSafeInteger(value) && value >= 0 && value < seedUpperBound;
}

export function shuffle(items, seed) {
	const result = [...items];
	let state = (seed % (generatorModulus - 1)) + 1;

	const random = () => {
		state = (state * generatorMultiplier) % generatorModulus;
		return state / generatorModulus;
	};

	for (let index = result.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(random() * (index + 1));
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}

	return result;
}
