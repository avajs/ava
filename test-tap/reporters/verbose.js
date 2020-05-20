'use strict';
const path = require('path');
const {test} = require('tap');
const {restoreClock} = require('../helper/fix-reporter-env')();
const TTYStream = require('../helper/tty-stream');
const report = require('../helper/report');
const Reporter = require('../../lib/reporters/default');

const run = (type, sanitizers = []) => t => {
	t.plan(1);

	const logFile = path.join(__dirname, `verbose.${type.toLowerCase()}.${process.version.split('.')[0]}.log`);

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.version]
	});
	const reporter = new Reporter({
		projectDir: report.projectDir(type),
		durationThreshold: 60000,
		reportStream: tty,
		stdStream: tty,
		watching: type === 'watch',
		isVerbose: true
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
test('verbose reporter - edge cases', run('edgeCases'));

test('verbose reporter - timeout', t => {
	restoreClock();

	t.test('single file run', run('timeoutInSingleFile'));
	t.test('multiple files run', run('timeoutInMultipleFiles'));
	t.test('single file with only certain tests matched run', run('timeoutWithMatch'));
	t.end();
});
