'use strict';
const path = require('path');
const chalk = require('chalk'); // Use default Chalk instance.

// Check if the test is being run without AVA cli
const isForked = typeof process.send === 'function';
if (!isForked) {
	const fp = path.relative('.', process.argv[1]);

	console.log();
	console.error(`Test files must be run with the AVA CLI:\n\n    ${chalk.grey.dim('$')} ${chalk.cyan('ava ' + fp)}\n`);

	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}
