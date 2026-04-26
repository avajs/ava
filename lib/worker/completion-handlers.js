import process from 'node:process';

import {completionHandlers} from './state.js';

export function runCompletionHandlers() {
	for (const handler of completionHandlers) {
		process.nextTick(() => handler());
	}
}

export function registerCompletionHandler(handler) {
	completionHandlers.push(handler);
}
