import {fileURLToPath} from 'url';

import {test} from 'tap';

import Reporter from '../../lib/reporters/default.js';
import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

const {restoreClock} = fixReporterEnv();

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

test('verbose reporter - regular run', run('regular'));
test('verbose reporter - failFast run', run('failFast'));
test('verbose reporter - second failFast run', run('failFast2'));
test('verbose reporter - only run', run('only'));
test('verbose reporter - watch mode run', run('watch'));
test('verbose reporter - edge cases', run('edgeCases'));

test('verbose reporter - timeout', t => {
	restoreClock();

	t.test('single file run', run('timeoutInSingleFile'));
	t.test('multiple files run', run('timeoutInMultipleFiles'));
	t.test('single file with only certain tests matched run', run('timeoutWithMatch'));
	t.end();
});
