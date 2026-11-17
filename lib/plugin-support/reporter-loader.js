import process from 'node:process';
import {BroadcastChannel, workerData} from 'node:worker_threads';

const {port, channelName, filename} = workerData;
const inactive = Symbol('inactive');
const handlers = new Set();
const acknowledgements = new Map();
const streamEnded = Promise.withResolvers();
const rejected = Promise.withResolvers();
let channel;
let expectedSequence = 0;
let isNegotiated = false;
let isInactive = false;
let finalSequence;

function acknowledge(seq, handler) {
	const waiting = acknowledgements.get(seq);
	if (!waiting) {
		return;
	}

	waiting.delete(handler);
	if (waiting.size > 0) {
		return;
	}

	acknowledgements.delete(seq);
	port.postMessage({type: 'ack', seq});
	if (seq === finalSequence) {
		streamEnded.resolve();
	}
}

function observe(handler) {
	const state = {
		queue: [], wake: undefined, previous: undefined, ended: false,
	};
	handlers.add(state);
	if (!channel) {
		channel = new BroadcastChannel(channelName);
		channel.addEventListener('message', ({data: message}) => {
			if (message.seq !== expectedSequence++) {
				throw new Error(`Plugin message sequence violation: received ${message.seq}, expected ${expectedSequence - 1}`);
			}

			if (message.type === 'end-of-stream') {
				finalSequence = message.seq;
			}

			if (message.sync) {
				acknowledgements.set(message.seq, new Set(handlers));
				if (handlers.size === 0) {
					port.postMessage({type: 'ack', seq: message.seq});
					acknowledgements.delete(message.seq);
					if (message.type === 'end-of-stream') {
						streamEnded.resolve();
					}
				}
			}

			for (const subscriber of handlers) {
				subscriber.queue.push(message);
				subscriber.wake?.();
			}
		});

		port.postMessage({type: 'ready'});
	}

	const messages = {
		[Symbol.asyncIterator]() {
			return this;
		},
		async next() {
			if (state.previous?.type === 'end-of-stream') {
				return {done: true};
			}

			if (state.previous?.sync) {
				acknowledge(state.previous.seq, state);
			}

			if (state.queue.length === 0 && !state.ended) {
				await new Promise(resolve => {
					state.wake = resolve;
				});
				state.wake = undefined;
			}

			if (state.ended) {
				return {done: true};
			}

			const value = state.queue.shift();
			state.previous = value;
			return {done: false, value};
		},
		async return() {
			return {done: true};
		},
	};

	const observing = (async () => {
		try {
			await handler(messages);
		} finally {
			state.ended = true;
			handlers.delete(state);
			for (const seq of acknowledgements.keys()) {
				acknowledge(seq, state);
			}

			state.wake?.();
		}
	})();
	// Handler failures are fatal even if a plugin forgets to await observe().
	observing.catch(error => {
		process.nextTick(() => {
			throw error;
		});
	});
	return observing;
}

function receive(type) {
	return new Promise(resolve => {
		const listener = message => {
			if (message.type !== type) {
				return;
			}

			port.off('message', listener);
			resolve(message);
		};

		port.on('message', listener);
	});
}

port.on('message', message => {
	if (message.type === 'terminate') {
		process.exit();
	} else if (message.type === 'reject') {
		rejected.reject(Object.assign(new Error(message.error.message), message.error));
	}
});

try {
	const {default: factory} = await import(filename);
	await factory({
		async negotiateProtocol(supported, plugin) {
			if (isNegotiated) {
				throw new Error('A plugin may negotiate its protocol only once');
			}

			isNegotiated = true;
			const configuration = receive('configure');
			port.postMessage({
				type: 'negotiate',
				supported,
				version: plugin.version,
				capabilities: plugin.capabilities,
				namespace: plugin.namespace,
				flags: plugin.flags ?? {},
			});
			const {id, context} = await Promise.race([configuration, rejected.promise]);
			const activation = receive('activate');
			const deactivation = receive('deactivate');
			const result = await Promise.race([plugin.configure(context), rejected.promise]);
			port.postMessage({type: 'configured', id, result});
			if (!result.active) {
				await Promise.race([deactivation, rejected.promise]);
				isInactive = true;
				throw inactive;
			}

			await Promise.race([activation, rejected.promise]);
			const {ava, identifier, projectDir, terminal} = context;
			return {
				ava, identifier, projectDir, terminal, ...(plugin.capabilities.includes('reporter') && {observe}),
			};
		},
	});
	if (!isNegotiated) {
		throw new Error('Plugin entry point did not negotiate a protocol');
	}

	// A handler may finish early. Keep acknowledging messages until the host closes the stream.
	if (!isInactive) {
		await Promise.race([streamEnded.promise, rejected.promise]);
	}
} catch (error) {
	if (error !== inactive) {
		throw error;
	}
} finally {
	channel?.close();
	port.close();
}
