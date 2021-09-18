import StackUtils from 'stack-utils';

const stackUtils = new StackUtils({
	ignoredPackages: [
		'@ava/typescript',
		'ava',
		'nyc',
	],
	internals: [
		// AVA internals, which ignoredPackages don't ignore when we run our own unit tests.
		/\/ava\/(?:lib\/|lib\/worker\/)?[\w-]+\.js:\d+:\d+\)?$/,
		// Only ignore Node.js internals that really are not useful for debugging.
		...StackUtils.nodeInternals().filter(regexp => !/\(internal/.test(regexp.source)),
		/\(internal\/process\/task_queues\.js:\d+:\d+\)$/,
		/\(internal\/modules\/cjs\/.+?\.js:\d+:\d+\)$/,
		/async Promise\.all \(index/,
		/new Promise \(<anonymous>\)/,
	],
});

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
export default function beautifyStack(stack) {
	if (!stack) {
		return [];
	}

	return stackUtils.clean(stack)
		.trim()
		.split('\n')
		.map(line => line.trim())
		.filter(line => line !== '');
}
