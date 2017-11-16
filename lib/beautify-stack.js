'use strict';
const StackUtils = require('stack-utils');
const cleanStack = require('clean-stack');
const debug = require('debug')('ava');

// Ignore unimportant stack trace lines
let ignoreStackLines = [];

const avaInternals = /\/ava\/(?:lib\/)?[\w-]+\.js:\d+:\d+\)?$/;
const avaDependencies = /\/node_modules\/(?:bluebird|empower-core|(?:ava\/node_modules\/)?(?:babel-runtime|core-js))\//;
const stackFrameLine = /^.+( \(.+:\d+:\d+\)|:\d+:\d+)$/;

if (!debug.enabled) {
	ignoreStackLines = StackUtils.nodeInternals();
	ignoreStackLines.push(avaInternals);
	ignoreStackLines.push(avaDependencies);
}

const stackUtils = new StackUtils({internals: ignoreStackLines});

function extractFrames(stack) {
	return stack
		.split('\n')
		.map(line => line.trim())
		.filter(line => stackFrameLine.test(line))
		.join('\n');
}

/**
 * Given a string value of the format generated for the `stack` property of a
 * V8 error object, return a string that contains only stack frame information
 * for frames that have relevance to the consumer.
 *
 * For example, given the following string value:
 *
 * ```
 * Error
 *     at inner (/home/ava/ex.js:7:12)
 *     at /home/ava/ex.js:12:5
 *     at outer (/home/ava/ex.js:13:4)
 *     at Object.<anonymous> (/home/ava/ex.js:14:3)
 *     at Module._compile (module.js:570:32)
 *     at Object.Module._extensions..js (module.js:579:10)
 *     at Module.load (module.js:487:32)
 *     at tryModuleLoad (module.js:446:12)
 *     at Function.Module._load (module.js:438:3)
 *     at Module.runMain (module.js:604:10)
 * ```
 *
 * ...this function returns the following string value:
 *
 * ```
 * inner (/home/ava/ex.js:7:12)
 * /home/ava/ex.js:12:5
 * outer (/home/ava/ex.js:13:4)
 * Object.<anonymous> (/home/ava/ex.js:14:3)
 * ```
 */
module.exports = stack => {
	if (!stack) {
		return '';
	}

	stack = extractFrames(stack);
	// Workaround for https://github.com/tapjs/stack-utils/issues/14
	// TODO: fix it in `stack-utils`
	stack = cleanStack(stack);

	return stackUtils.clean(stack)
		// Remove the trailing newline inserted by the `stack-utils` module
		.trim();
};
