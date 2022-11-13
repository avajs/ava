import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

const {restoreClock} = fixReporterEnv();

test(async t => {
	const {default: Reporter} = await import('../../lib/reporters/default.js');

	const run = (type, sanitizers = []) => t => {
		t.plan(1);

		const logFile = fileURLToPath(new URL(`default.${type.toLowerCase()}.${process.version.split('.')[0]}.log`, import.meta.url));

		const tty = new TTYStream({
			columns: 200,
			sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.timers, report.sanitizers.version],
		});
		const reporter = new Reporter({
			extensions: ['cjs'],
			projectDir: report.projectDir(type),
			durationThreshold: 60_000,
			reportStream: tty,
			stdStream: tty,
			watching: type === 'watch',
		});

		return report[type](reporter)
			.then(() => {
				tty.end();
				return tty.asBuffer();
			})
			.then(buffer => report.assert(t, logFile, buffer))
			.catch(t.threw);
	};

	t.test('default reporter - regular run', run('regular'));
	t.test('default reporter - failFast run', run('failFast'));
	t.test('default reporter - second failFast run', run('failFast2'));
	t.test('default reporter - only run', run('only'));
	t.test('default reporter - watch mode run', run('watch'));
	t.test('default reporter - edge cases', run('edgeCases', [report.sanitizers.acorn]));

	t.test('default reporter - timeout', t => {
		restoreClock();

		t.test('single file run', run('timeoutInSingleFile'));
		t.test('multiple files run', run('timeoutInMultipleFiles'));
		t.test('single file with only certain tests matched run', run('timeoutWithMatch'));
		t.test('logs provided during a pending test logged at the end', run('timeoutContextLogs'));
		t.end();
	});
});
