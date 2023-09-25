import fs from 'node:fs/promises';

const internalEvents = [];

export default {
	files: [
		'test.js',
	],
	nonSemVerExperiments: {
		observeRunsFromConfig: true,
	},
	async observeRun(run) {
		for await (const event of run.events) {
			internalEvents.push(event);

			if (event.type === 'stateChange' && event.stateChange.type === 'end') {
				await fs.writeFile('internal-events.json', JSON.stringify(internalEvents));
			}
		}
	},
};
