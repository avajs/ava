import {createHash, randomBytes} from 'node:crypto';

export function normalizeSeed({randomize, seed}) {
	if (randomize !== undefined && typeof randomize !== 'boolean') {
		throw new TypeError('randomize must be a boolean.');
	}

	if (seed !== undefined && (typeof seed !== 'string' || !/^[\w\-.]+$/u.test(seed))) {
		throw new TypeError('seed must be a non-empty string containing only letters, digits, underscores, dots or hyphens.');
	}

	return seed ?? (randomize ? randomBytes(16).toString('hex') : undefined);
}

export function randomizeTasks(tasks, seed) {
	if (seed === undefined) {
		return tasks;
	}

	// Ranking unique titles keeps filtered runs in the same relative order.
	return tasks.map(task => ({
		task,
		rank: createHash('sha256').update(JSON.stringify([seed, task.title])).digest(),
	})).toSorted((a, b) => a.rank.compare(b.rank)).map(({task}) => task);
}
