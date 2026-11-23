import process from 'node:process';

import {Chalk} from 'chalk'; // eslint-disable-line unicorn/import-style
import figures from 'figures';

import pkg from '../pkg.js';
import TapReporter from '../reporters/tap.js';

const flush = stream => new Promise((resolve, reject) => {
	stream.write('', error => {
		if (error) {
			reject(error);
		} else {
			resolve();
		}
	});
});

export default async function tapPlugin({negotiateProtocol}) {
	const protocol = await negotiateProtocol(['experimental'], {
		version: pkg.version,
		namespace: 'tap',
		capabilities: ['reporter'],
		flags: {tap: {type: 'boolean', description: 'Generate TAP output'}},
		configure({flags, options, mode}) {
			if (mode.watch || mode.debug) {
				return {
					active: false,
					diagnostics: !options && flags.tap
						? [{level: 'error', message: `The TAP reporter is not available ${mode.watch ? 'when using watch mode' : 'when debugging'}.`}]
						: [],
				};
			}

			return {active: Boolean(flags.tap ?? options), claims: ['stdout']};
		},
	});
	const chalk = new Chalk({level: protocol.terminal.stdout.colorLevel});
	const reporter = new TapReporter({
		projectDir: protocol.projectDir,
		separator: ` ${chalk.gray.dim(figures.pointerSmall)} `,
		stderr: process.stderr,
		stdout: process.stdout,
	});
	await protocol.observe(async messages => {
		loop: for await (const message of messages) {
			switch (message.type) {
				case 'run-start': {
					reporter.startRun(message.plan);
					continue loop;
				}

				case 'event': {
					reporter.consumeEvent(message.event);
					continue loop;
				}

				case 'run-end': {
					reporter.endRun(message.totals);
					await Promise.all([flush(process.stdout), flush(process.stderr)]);
					continue loop;
				}

				case 'end-of-stream': {
					await Promise.all([flush(process.stdout), flush(process.stderr)]);
					continue loop;
				}

				default: {
					continue loop;
				}
			}
		}
	});
}
