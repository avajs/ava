import path from 'node:path';
import process from 'node:process';

import {isRunningInThread, isRunningInChildProcess} from './utils.js';

// Check if the test is being run without AVA cli
if (!isRunningInChildProcess && !isRunningInThread) {
	if (process.argv[1]) {
		const fp = path.relative('.', process.argv[1]);

		console.log();
		console.error(`Test files must be run with the AVA CLI:\n\n    $ ava ${fp}\n`);

		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	} else {
		throw new Error('The \u2018ava\u2019 module can only be imported in test files');
	}
}
