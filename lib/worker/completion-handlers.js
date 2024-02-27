import process from 'node:process';

import state from './state.cjs';

export function runCompletionHandlers() {
	for (const handler of state.completionHandlers) {
		process.nextTick(() => handler());
	}
}

export function registerCompletionHandler(handler) {
	state.completionHandlers.push(handler);
}
