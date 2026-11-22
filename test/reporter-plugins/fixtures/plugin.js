import {once} from 'node:events';
import process from 'node:process';
import {setTimeout} from 'node:timers/promises';
import {BroadcastChannel} from 'node:worker_threads';

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
		flags: scenario === 'no-flags'
			? undefined
			: {
				[namespace]: {type: scenario === 'namespace-value' ? 'string' : 'boolean', description: 'Enable sample'},
				[scenario === 'flag' ? 'wrong-option' : `${namespace}-extra`]: {type: 'string', description: 'Extra option'},
			},
		async configure(configuration) {
			context = configuration;
			if (scenario === 'configure-error') {
				throw new Error('configuration failed');
			}

			return {
				active: scenario !== 'inactive' && scenario !== 'inactive-cleanup' && scenario !== 'inactive-exit-one',
				claims: scenario === 'no-stdout' ? [] : ['stdout'],
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

		if (scenario === 'inactive-exit-one') {
			process.exit(1);
		}
	}

	process.stdout.write(`${JSON.stringify({context, forceColor: process.env.FORCE_COLOR, identifier: protocol.identifier})}\n`);
	if (scenario === 'ready-hang') {
		return;
	}

	if (scenario === 'sequence-gap') {
		const {addEventListener} = BroadcastChannel.prototype;
		BroadcastChannel.prototype.addEventListener = function (type, listener, options) {
			return addEventListener.call(this, type, event => {
				listener({data: {...event.data, seq: event.data.seq + 1}});
			}, options);
		};
	}

	const control = scenario === 'multiple' ? new BroadcastChannel(context.options.controlChannel) : undefined;
	const observe = async (messages, index) => {
		for await (const message of messages) {
			const released = scenario === 'multiple' && index === 1 && (message.type === 'run-end' || message.type === 'end-of-stream')
				? once(control, 'message')
				: undefined;
			process.stdout.write(`${JSON.stringify({index, type: message.type, seq: message.seq})}\n`);
			if (scenario === 'early') {
				return;
			}

			if (scenario === 'crash' || scenario === 'no-stdout') {
				throw new Error('observation failed');
			}

			if (scenario === 'fail-fast-crash' && message.type === 'event' && message.event.type === 'test-failed') {
				throw new Error('observation failed after test failure');
			}

			if (scenario === 'exit-zero') {
				process.exit(0);
			}

			if (scenario === 'flush-hang' && message.type === 'run-end') {
				await new Promise(() => {});
			}

			if (released) {
				await released;
			}
		}

		if (scenario !== 'tail') {
			return;
		}

		process.stdout.write('x'.repeat(256 * 1024));
		process.stderr.write('y'.repeat(256 * 1024));
	};

	try {
		const first = protocol.observe(messages => observe(messages, 0));
		if (scenario === 'multiple') {
			await Promise.all([first, protocol.observe(messages => observe(messages, 1))]);
		} else {
			await first;
		}

		if (scenario === 'exit-one') {
			process.exit(1);
		}
	} finally {
		control?.close();
	}
}
