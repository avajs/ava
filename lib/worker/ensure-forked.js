'use strict';
const path = require('path');
const chalk = require('chalk');
// Use default Chalk instance.
let options = {};

try {
	// Will fail when options haven't been set
	options = require('./options').get();
} catch (_) {}

// Check if the test is being run without AVA cli
const isForked = typeof process.send === 'function' || options.usingWorker;
if (!isForked) {
	if (process.argv[1]) {
		const fp = path.relative('.', process.argv[1]);

		console.log();
		console.error(`Test files must be run with the AVA CLI:\n\n    ${chalk.grey.dim('$')} ${chalk.cyan('ava ' + fp)}\n`);

		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	} else {
		throw new Error('The \'ava\' module can only be imported in test files');
	}
}
