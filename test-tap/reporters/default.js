import path from 'node:path';
import {setImmediate as delayImmediate} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';

import {test} from 'tap';

import RunStatus from '../../lib/run-status.js';
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
			sanitizers: [
				...sanitizers,
				report.sanitizers.cwd,
				report.sanitizers.esmLoader,
				report.sanitizers.experimentalWarning,
				report.sanitizers.posix,
				report.sanitizers.tapLoaders,
				report.sanitizers.timers,
				report.sanitizers.version,
			],
		});
		const reporter = new Reporter({
			extensions: ['js'],
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

	t.test('default reporter - snapshot update count', async t => {
		t.plan(4);

		const projectDir = '/project';
		const testFile = path.join(projectDir, 'test.js');
		const tty = new TTYStream({columns: 200});
		const reporter = new Reporter({
			extensions: ['js'],
			projectDir,
			durationThreshold: 60_000,
			reportStream: tty,
			stdStream: tty,
			watching: false,
		});
		const status = new RunStatus(1, null, {
			filter: [],
			ignoredFilterPatternFiles: [],
			selectionCount: 1,
			testFileCount: 1,
		});

		status.observeWorker({onStateChange() {}}, testFile, {});
		reporter.startRun({
			bailWithoutReporting: false,
			failFastEnabled: false,
			filePathPrefix: projectDir,
			files: [testFile],
			firstRun: true,
			matching: false,
			previousFailures: 0,
			status,
		});

		status.emitStateChange({type: 'selected-test', testFile, title: 'updates snapshots'});
		status.emitStateChange({
			duration: 1,
			knownFailing: false,
			logs: [],
			testFile,
			title: 'updates snapshots',
			type: 'test-passed',
		});
		status.emitStateChange({
			files: {
				changedFiles: [
					path.join(projectDir, 'test.js.snap'),
					path.join(projectDir, 'test.js.md'),
					path.join(projectDir, 'other.js.snap'),
				],
				temporaryFiles: [],
			},
			type: 'touched-files',
		});
		await delayImmediate();
		reporter.endRun();
		tty.end();

		const output = stripVTControlCharacters(tty.asBuffer().toString('utf8'));
		t.match(output, '1 test passed');
		t.match(output, '2 snapshot files updated');
		t.notMatch(output, '3 snapshot files updated');
		t.equal(status.stats.snapshotFilesUpdated, 2);
	});
});
