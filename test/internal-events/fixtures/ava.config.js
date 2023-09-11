import fs from 'node:fs/promises';

const internalEvents = [];

export default {
	files: [
		'test.js',
	],
	async onInternalEvent(event) {
		internalEvents.push(event);

		if (event.type === 'stateChange' && event.stateChange.type === 'end') {
			await fs.writeFile('internal-events.json', JSON.stringify(internalEvents));
		}
	},
};
