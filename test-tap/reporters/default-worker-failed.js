import {EventEmitter} from 'node:events';
import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import Reporter from '../../lib/reporters/default.js';
import TTYStream from '../helper/tty-stream.js';

test('default reporter says when a worker failed before declaring tests', t => {
	t.plan(1);

	const testFile = fileURLToPath(new URL('../fixture/report/regular/bad-test-chain.js', import.meta.url));
	const tty = new TTYStream({columns: 200});
	const reporter = new Reporter({
		extensions: ['js'],
		projectDir: fileURLToPath(new URL('../fixture/report/regular/', import.meta.url)),
		durationThreshold: 60_000,
		reportStream: tty,
		stdStream: tty,
		watching: false,
	});

	const status = new EventEmitter();
	reporter.startRun({
		failFastEnabled: false,
		filePathPrefix: '',
		files: [testFile],
		matching: false,
		previousFailures: 0,
		status: {
			emptyParallelRun: false,
			on: status.on.bind(status),
			selectionInsights: {
				ignoredFilterPatternFiles: [],
				selectionCount: 1,
				testFileCount: 1,
			},
		},
	});

	status.emit('stateChange', {
		data: {
			stats: {
				byFile: new Map([[testFile, {declaredTests: 0}]]),
			},
			type: 'stats',
		},
	});
	status.emit('stateChange', {
		data: {
			nonZeroExitCode: 1,
			testFile,
			type: 'worker-failed',
		},
	});

	tty.end();
	t.match(tty.asBuffer().toString('utf8'), 'No tests were declared before the test file failed.');
});
