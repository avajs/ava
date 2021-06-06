import {fileURLToPath} from 'url';

import {test} from 'tap';

import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

const {restoreClock} = fixReporterEnv();

test(async t => {
	const {default: Reporter} = await import('../../lib/reporters/default.js');

	const run = (type, sanitizers = []) => t => {
		t.plan(1);

		const logFile = fileURLToPath(new URL(`verbose.${type.toLowerCase()}.${process.version.split('.')[0]}.log`, import.meta.url));

		const tty = new TTYStream({
			columns: 200,
			sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.timers, report.sanitizers.version]
		});
		const reporter = new Reporter({
			extensions: ['cjs'],
			projectDir: report.projectDir(type),
			durationThreshold: 60000,
			reportStream: tty,
			stdStream: tty,
			verbose: true,
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

	t.test('verbose reporter - regular run', run('regular'));
	t.test('verbose reporter - failFast run', run('failFast'));
	t.test('verbose reporter - second failFast run', run('failFast2'));
	t.test('verbose reporter - only run', run('only'));
	t.test('verbose reporter - watch mode run', run('watch'));
	t.test('verbose reporter - edge cases', run('edgeCases'));

	t.test('verbose reporter - timeout', t => {
		restoreClock();

		t.test('single file run', run('timeoutInSingleFile'));
		t.test('multiple files run', run('timeoutInMultipleFiles'));
		t.test('single file with only certain tests matched run', run('timeoutWithMatch'));
		t.end();
	});
});
