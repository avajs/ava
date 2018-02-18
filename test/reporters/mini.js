'use strict';
require('../helper/report').captureStdIOReliability();
require('../helper/fix-reporter-env')();

const path = require('path');
const test = require('tap').test;
const TTYStream = require('../helper/tty-stream');
const report = require('../helper/report');
const MiniReporter = require('../../lib/reporters/mini');

const run = type => t => {
	t.plan(1);

	const logFile = path.join(__dirname, `mini.${type.toLowerCase()}.log`);

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [report.sanitizers.cwd, report.sanitizers.posix, report.sanitizers.unreliableProcessIO]
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
		.then(buffer => report.assert(t, logFile, buffer, {stripStdIO: true, alsoStripSeparator: false}))
		.catch(t.threw);
};

test('mini reporter - regular run', run('regular'));
test('mini reporter - failFast run', run('failFast'));
test('mini reporter - second failFast run', run('failFast2'));
test('mini reporter - only run', run('only'));
test('mini reporter - watch mode run', run('watch'));
