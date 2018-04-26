'use strict';
require('../helper/report').captureStdIOReliability();
require('../helper/fix-reporter-env')();

const path = require('path');
const test = require('tap').test;
const TTYStream = require('../helper/tty-stream');
const report = require('../helper/report');
const VerboseReporter = require('../../lib/reporters/verbose');

const run = type => t => {
	t.plan(1);

	const logFile = path.join(__dirname, `verbose.${type.toLowerCase()}.log`);

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [report.sanitizers.cwd, report.sanitizers.posix, report.sanitizers.slow, report.sanitizers.unreliableProcessIO]
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
		.then(buffer => report.assert(t, logFile, buffer, {stripStdIO: true, alsoStripSeparator: true}))
		.catch(t.threw);
};

test('verbose reporter - regular run', run('regular'));
test('verbose reporter - failFast run', run('failFast'));
test('verbose reporter - second failFast run', run('failFast2'));
test('verbose reporter - only run', run('only'));
test('verbose reporter - watch mode run', run('watch'));
