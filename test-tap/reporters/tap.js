import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

fixReporterEnv();

test(async t => {
	const {default: TapReporter} = await import('../../lib/reporters/tap.js');

	const run = (type, sanitizers = []) => t => {
		t.plan(1);

		const logFile = fileURLToPath(new URL(`tap.${type.toLowerCase()}.${process.version.split('.')[0]}.log`, import.meta.url));

		const tty = new TTYStream({
			columns: 200,
			sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.timers],
		});
		const reporter = new TapReporter({
			extensions: ['cjs'],
			projectDir: report.projectDir(type),
			reportStream: tty,
			stdStream: tty,
		});
		return report[type](reporter)
			.then(() => {
				tty.end();
				return tty.asBuffer();
			})
			.then(buffer => report.assert(t, logFile, buffer))
			.catch(t.threw);
	};

	t.test('tap reporter - regular run', run('regular'));
	t.test('tap reporter - failFast run', run('failFast'));
	t.test('tap reporter - second failFast run', run('failFast2'));
	t.test('tap reporter - only run', run('only'));
	t.test('tap reporter - edge cases', run('edgeCases'));
});
