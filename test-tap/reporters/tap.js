import {fileURLToPath} from 'url';

import {test} from 'tap';

import TapReporter from '../../lib/reporters/tap.js';
import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

fixReporterEnv();

const run = (type, sanitizers = []) => t => {
	t.plan(1);

	const logFile = fileURLToPath(new URL(`tap.${type.toLowerCase()}.${process.version.split('.')[0]}.log`, import.meta.url));

	const tty = new TTYStream({
		columns: 200,
		sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.timers]
	});
	const reporter = new TapReporter({
		extensions: ['cjs'],
		projectDir: report.projectDir(type),
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
