import {fileURLToPath} from 'url';

import {test} from 'tap';

import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

fixReporterEnv();

test(async t => {
	const {default: Reporter} = await import('../../lib/reporters/default.js');

	const run = (type, sanitizers = []) => t => {
		t.plan(1);

		const logFile = fileURLToPath(new URL(`mini.${type.toLowerCase()}.${process.version.split('.')[0]}.log`, import.meta.url));

		const tty = new TTYStream({
			columns: 200,
			sanitizers: [...sanitizers, report.sanitizers.cwd, report.sanitizers.experimentalWarning, report.sanitizers.posix, report.sanitizers.timers, report.sanitizers.version]
		});
		const reporter = new Reporter({
			extensions: ['cjs'],
			projectDir: report.projectDir(type),
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
			.then(buffer => report.assert(t, logFile, buffer))
			.catch(t.threw);
	};

	t.test('mini reporter - regular run', run('regular'));
	t.test('mini reporter - failFast run', run('failFast'));
	t.test('mini reporter - second failFast run', run('failFast2'));
	t.test('mini reporter - only run', run('only'));
	t.test('mini reporter - watch mode run', run('watch'));
	t.test('mini reporter - edge cases', run('edgeCases'));
});
