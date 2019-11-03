'use strict';
require('../helper/fix-reporter-env')();

// Excessive writes occur in Node.js 11. These don't have a visual impact but prevent the integration tests from passing.
if (process.version.startsWith('v11')) {
	process.exit(0); // eslint-disable-line unicorn/no-process-exit
}

const path = require('path');
const {test} = require('tap');
const TTYStream = require('../helper/tty-stream');
const report = require('../helper/report');
const MiniReporter = require('../../lib/reporters/mini');

const run = (type, sanitizers = []) => t => {
	t.plan(1);

	const logFile = path.join(__dirname, `mini.${type.toLowerCase()}.log`);

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.traces, report.sanitizers.version]
	});
	const reporter = new MiniReporter({
		spinner: {
			interval: 60 * 60 * 1000, // No need to update the spinner
			color: false,
			frames: ['*']
		},
		reportStream: tty,
		stdStream: tty,
		watching: type === 'watch'
	});
	return report[type](reporter)
		.then(() => {
			tty.end();
			return tty.asBuffer();
		})
		.then(buffer => report.assert(t, logFile, buffer))
		.catch(t.threw);
};

test('mini reporter - regular run', run('regular'));
test('mini reporter - failFast run', run('failFast'));
test('mini reporter - second failFast run', run('failFast2'));
test('mini reporter - only run', run('only'));
test('mini reporter - watch mode run', run('watch'));
test('mini reporter - typescript', run('typescript', [report.sanitizers.lineEndings]));
test('mini reporter - edge cases', run('edgeCases'));
