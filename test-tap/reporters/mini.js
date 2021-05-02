import {fileURLToPath} from 'url';

import {test} from 'tap';

import Reporter from '../../lib/reporters/default.js';
import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

fixReporterEnv();

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

test('mini reporter - regular run', run('regular'));
test('mini reporter - failFast run', run('failFast'));
test('mini reporter - second failFast run', run('failFast2'));
test('mini reporter - only run', run('only'));
test('mini reporter - watch mode run', run('watch'));
test('mini reporter - edge cases', run('edgeCases'));
