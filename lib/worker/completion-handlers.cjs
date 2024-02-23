'use strict';

const process = require('node:process');

const state = require('./state.cjs');

exports.runCompletionHandlers = () => {
	for (const handler of state.completionHandlers) {
		process.nextTick(() => handler());
	}
};

exports.registerCompletionHandler = handler => {
	state.completionHandlers.push(handler);
};
