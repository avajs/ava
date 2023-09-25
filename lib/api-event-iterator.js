import {on} from 'node:events';

export async function * asyncEventIteratorFromApi(api) {
	for await (const [plan] of on(api, 'run')) {
		yield {
			type: 'run',
			plan,
		};

		for await (const [stateChange] of on(plan.status, 'stateChange')) {
			yield {
				type: 'stateChange',
				stateChange,
			};
		}
	}
}
