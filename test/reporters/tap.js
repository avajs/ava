'use strict';
require('../helper/report').captureStdIOReliability();
require('../helper/fix-reporter-env')();

const path = require('path');
const test = require('tap').test;
const TTYStream = require('../helper/tty-stream');
const report = require('../helper/report');
const TapReporter = require('../../lib/reporters/tap');

const run = type => t => {
	t.plan(1);

	const logFile = path.join(__dirname, `tap.${type.toLowerCase()}.log`);

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [report.sanitizers.cwd, report.sanitizers.posix, report.sanitizers.unreliableProcessIO]
	});
	const reporter = new TapReporter({
		reportStream: tty,
		stdStream: tty
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
