'use strict';
const StackUtils = require('stack-utils');
const cleanStack = require('clean-stack');
const debug = require('debug')('ava');

// Ignore unimportant stack trace lines
let ignoreStackLines = [];

const avaInternals = /\/ava\/(?:lib\/)?[\w-]+\.js:\d+:\d+\)?$/;
const avaDependencies = /\/node_modules\/(?:bluebird|empower-core|(?:ava\/node_modules\/)?(?:babel-runtime|core-js))\//;

if (!debug.enabled) {
	ignoreStackLines = StackUtils.nodeInternals();
	ignoreStackLines.push(avaInternals);
	ignoreStackLines.push(avaDependencies);
}

const stackUtils = new StackUtils({internals: ignoreStackLines});

module.exports = stack => {
	if (!stack) {
		return '';
	}

	// Workaround for https://github.com/tapjs/stack-utils/issues/14
	// TODO: fix it in `stack-utils`
	stack = cleanStack(stack);

	const title = stack.split('\n')[0];
	const lines = stackUtils
		.clean(stack)
		.split('\n')
		.map(x => `    ${x}`)
		.join('\n');

	return `${title}\n${lines}`;
};
