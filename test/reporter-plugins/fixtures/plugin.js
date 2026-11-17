import {once} from 'node:events';
import process from 'node:process';
import {setTimeout} from 'node:timers/promises';
import {parentPort} from 'node:worker_threads';

const parameters = new URL(import.meta.url).searchParams;
const scenario = parameters.get('scenario') ?? 'normal';
const namespace = parameters.get('namespace') ?? 'sample';

export default async function plugin({negotiateProtocol}) {
	if (scenario === 'import-error') {
		throw new Error('plugin import failed');
	}

	if (scenario === 'startup-hang') {
		await new Promise(() => {});
	}

	let context;
	const negotiation = negotiateProtocol([scenario.startsWith('unsupported') ? 'unsupported' : 'experimental'], {
		version: '1.0.0',
		namespace: scenario === 'namespace' ? 'wrong' : namespace,
		capabilities: scenario === 'capability' ? ['future'] : (scenario === 'claim-capability' ? [] : ['reporter']),
		flags: {
			[namespace]: {type: scenario === 'activation' ? 'string' : 'boolean', description: 'Enable sample'},
			[scenario === 'flag' ? 'wrong-option' : `${namespace}-extra`]: {type: 'string', description: 'Extra option'},
		},
		async configure(configuration) {
			context = configuration;
			if (scenario === 'configure-error') {
				throw new Error('configuration failed');
			}

			return {
				active: scenario !== 'inactive' && scenario !== 'inactive-cleanup',
				claims: scenario === 'noncritical' ? [] : ['stdout'],
				diagnostics: scenario.startsWith('diagnostic') ? [{level: 'error', message: 'invalid options'}] : [],
			};
		},
	});
	let protocol;
	try {
		protocol = await negotiation;
	} finally {
		if (scenario.endsWith('cleanup')) {
			await setTimeout(20);
			process.stderr.write('cleanup finished\n');
		}
	}

	process.stdout.write(`${JSON.stringify({context, forceColor: process.env.FORCE_COLOR, identifier: protocol.identifier})}\n`);
	if (scenario === 'ready-hang') {
		return;
	}

	const observe = async (messages, index) => {
		for await (const message of messages) {
			process.stdout.write(`${JSON.stringify({index, type: message.type, seq: message.seq})}\n`);
			if (scenario === 'early') {
				return;
			}

			if (scenario === 'crash' || scenario === 'noncritical') {
				throw new Error('observation failed');
			}

			if (scenario === 'exit-zero') {
				process.exit(0);
			}

			if (scenario === 'flush-hang' && message.type === 'run-end') {
				await new Promise(() => {});
			}

			if (scenario === 'multiple' && index === 1 && (message.type === 'run-end' || message.type === 'end-of-stream')) {
				await once(parentPort, 'message');
			}
		}

		if (scenario !== 'tail') {
			return;
		}

		process.stdout.write('x'.repeat(256 * 1024));
		process.stderr.write('y'.repeat(256 * 1024));
	};

	const first = protocol.observe(messages => observe(messages, 0));
	if (scenario === 'multiple') {
		await Promise.all([first, protocol.observe(messages => observe(messages, 1))]);
	} else {
		await first;
	}
}
