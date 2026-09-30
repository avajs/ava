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
			sanitizers: [
				...sanitizers,
				report.sanitizers.cwd,
				report.sanitizers.esmLoader,
				report.sanitizers.experimentalWarning,
				report.sanitizers.libLineNumbers,
				report.sanitizers.nodeInternalLineNumbers,
				report.sanitizers.posix,
				report.sanitizers.tapLoaders,
				report.sanitizers.timers,
			],
		});
		const reporter = new TapReporter({
			extensions: ['js'],
			projectDir: report.projectDir(type),
			reportStream: tty,
			stdStream: tty,
			sanitizeStackOutput: report.sanitizers.cwd,
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
	t.test('Node.js internal stack locations are stable across runtime releases', t => {
		for (const location of ['318:16', '319:16', '346:16', '355:16']) {
			t.equal(
				report.sanitizers.nodeInternalLineNumbers(`compileSourceTextModule (node:internal/modules/esm/utils:${location})`),
				'compileSourceTextModule (node:internal/modules/esm/utils)',
			);
		}

		const applicationFrame = 'test (file:///project/test.js:3:1)';
		t.equal(report.sanitizers.nodeInternalLineNumbers(applicationFrame), applicationFrame);
		t.end();
	});
});
