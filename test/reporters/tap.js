'use strict';
require('../helper/fix-reporter-env')();

const path = require('path');
const {test} = require('tap');
const TTYStream = require('../helper/tty-stream');
const report = require('../helper/report');
const TapReporter = require('../../lib/reporters/tap');

const run = (type, sanitizers = []) => t => {
	t.plan(1);

	const logFile = path.join(__dirname, `tap.${type.toLowerCase()}.log`);

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.timeout, report.sanitizers.traces]
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
		.then(buffer => report.assert(t, logFile, buffer))
		.catch(t.threw);
};

test('verbose reporter - regular run', run('regular'));
test('verbose reporter - failFast run', run('failFast'));
test('verbose reporter - second failFast run', run('failFast2'));
test('verbose reporter - only run', run('only'));
test('mini reporter - edge cases', run('edgeCases'));
