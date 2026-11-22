import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {test} from 'tap';

import {runEnd, runEvent, runPlan} from '../../lib/plugin-support/run-messages.js';
import fixReporterEnv from '../helper/fix-reporter-env.js';
import report from '../helper/report.js';
import TTYStream from '../helper/tty-stream.js';

fixReporterEnv();

test(async t => {
	const {default: TapReporter} = await import('../../lib/reporters/tap.js');

	const run = (type, sanitizers = []) => t => {
		t.plan(1);

		const logFile = fileURLToPath(new URL(`tap.${type.toLowerCase()}.${process.version.split('.', 1)[0]}.log`, import.meta.url));

		const tty = new TTYStream({
			columns: 200,
			sanitizers: [
				...sanitizers,
				report.sanitizers.cwd,
				report.sanitizers.esmLoader,
				report.sanitizers.experimentalWarning,
				report.sanitizers.libLineNumbers,
				report.sanitizers.posix,
				report.sanitizers.tapLoaders,
				report.sanitizers.timers,
			],
		});
		const tapReporter = new TapReporter({
			projectDir: report.projectDir(type),
			sanitizeStackOutput: report.sanitizers.cwd,
			separator: ' › ',
			stderr: tty,
			stdout: tty,
		});

		// Feed the reporter the same messages the plugin protocol would.
		let currentPlan;
		const reporter = {
			startRun(plan) {
				currentPlan = plan;
				tapReporter.startRun(runPlan(plan, ['js']));
				plan.status.on('stateChange', ({data: evt}) => {
					const event = runEvent(evt, plan);
					if (event) {
						tapReporter.consumeEvent(event);
					}
				});
			},
			endRun() {
				tapReporter.endRun(runEnd(currentPlan).totals);
			},
		};
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
	t.test('tap reporter - timeout', run('timeoutInSingleFile'));
});
