'use strict';
const StackUtils = require('stack-utils');
const debug = require('debug')('ava');

// Ignore unimportant stack trace lines
const ignoreStackLines = [];

const avaInternals = /\/ava\/(?:lib\/|lib\/worker\/)?[\w-]+\.js:\d+:\d+\)?$/;
const avaDependencies = /\/node_modules\/(?:@ava\/babel|@ava\/require-precompiled|append-transform|empower-core|nyc|require-precompiled|(?:ava\/node_modules\/)?(?:babel-runtime|core-js))\//;

if (!debug.enabled) {
	ignoreStackLines.push(avaInternals);
	ignoreStackLines.push(avaDependencies);
	ignoreStackLines.push(/\(internal\/process\/task_queues\.js:\d+:\d+\)$/);
	ignoreStackLines.push(/\(internal\/modules\/cjs\/loader\.js:\d+:\d+\)$/);
}

const stackUtils = new StackUtils({internals: ignoreStackLines});

/*
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
 * Module._compile (module.js:570:32)
 * Object.Module._extensions..js (module.js:579:10)
 * Module.load (module.js:487:32)
 * tryModuleLoad (module.js:446:12)
 * Function.Module._load (module.js:438:3)
 * Module.runMain (module.js:604:10)
 * ```
 */
module.exports = stack => {
	if (!stack) {
		return '';
	}

	return stackUtils.clean(stack)
		// Remove the trailing newline inserted by the `stack-utils` module
		.trim()
		// Remove remaining file:// prefixes, inserted by `esm`, that are not
		// cleaned up by `stack-utils`
		.split('\n').map(line => line.replace(/\(file:\/\/(?<path>[^/].+:\d+:\d+)\)$/, '($<path>)')).join('\n');
};
