'use strict';
const path = require('path');
const {test} = require('tap');
const {restoreClock} = require('../helper/fix-reporter-env')();
const TTYStream = require('../helper/tty-stream');
const report = require('../helper/report');
const VerboseReporter = require('../../lib/reporters/verbose');

const run = (type, sanitizers = []) => t => {
	t.plan(1);

	const logFile = path.join(__dirname, `verbose.${type.toLowerCase()}.log`);

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.slow, report.sanitizers.traces, report.sanitizers.version]
	});
	const reporter = new VerboseReporter({
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

test('verbose reporter - regular run', run('regular'));
test('verbose reporter - failFast run', run('failFast'));
test('verbose reporter - second failFast run', run('failFast2'));
test('verbose reporter - only run', run('only'));
test('verbose reporter - watch mode run', run('watch'));
test('verbose reporter - typescript', run('typescript', [report.sanitizers.lineEndings]));
test('verbose reporter - edge cases', run('edgeCases'));

test('verbose reporter - timeout', t => {
	restoreClock();

	t.test('single file run', run('timeoutInSingleFile'));
	t.test('multiple files run', run('timeoutInMultipleFiles'));
	t.test('single file with only certain tests matched run', run('timeoutWithMatch'));
	t.end();
});
