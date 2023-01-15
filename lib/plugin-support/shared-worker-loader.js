import {EventEmitter, on} from 'node:events';
import process from 'node:process';
import {workerData, parentPort, threadId} from 'node:worker_threads';

import pkg from '../pkg.cjs';

// Used to forward messages received over the `parentPort` and any direct ports
// to test workers. Every subscription adds a listener, so do not enforce any
// maximums.
const events = new EventEmitter().setMaxListeners(0);
const emitMessage = message => {
	// Wait for a turn of the event loop, to allow new subscriptions to be
	// set up in response to the previous message.
	setImmediate(() => events.emit('message', message));
};

// Map of active test workers, used in receiveMessages() to get a reference to
// the TestWorker instance, and relevant release functions.
const activeTestWorkers = new Map();

const internalMessagePort = Symbol('Internal MessagePort');

class TestWorker {
	constructor(id, file, port) {
		this.id = id;
		this.file = file;
		this[internalMessagePort] = port;
	}

	teardown(fn) {
		let done = false;
		const teardownFn = async () => {
			if (done) {
				return;
			}

			done = true;
			if (activeTestWorkers.has(this.id)) {
				activeTestWorkers.get(this.id).teardownFns.delete(teardownFn);
			}

			await fn();
		};

		activeTestWorkers.get(this.id).teardownFns.add(teardownFn);

		return teardownFn;
	}

	publish(data) {
		return publishMessage(this, data);
	}

	async * subscribe() {
		yield * receiveMessages(this);
	}
}

class ReceivedMessage {
	constructor(testWorker, id, data) {
		this.testWorker = testWorker;
		this.id = id;
		this.data = data;
	}

	reply(data) {
		return publishMessage(this.testWorker, data, this.id);
	}
}

// Ensure that, no matter how often it's received, we have a stable message
// object.
const messageCache = new WeakMap();

async function * receiveMessages(fromTestWorker, replyTo) {
	for await (const [message] of on(events, 'message')) {
		if (fromTestWorker !== undefined) {
			if (message.type === 'deregister-test-worker' && message.id === fromTestWorker.id) {
				return;
			}

			if (message.type === 'message' && message.testWorkerId !== fromTestWorker.id) {
				continue;
			}
		}

		if (message.type !== 'message') {
			continue;
		}

		if (replyTo === undefined && message.replyTo !== undefined) {
			continue;
		}

		if (replyTo !== undefined && message.replyTo !== replyTo) {
			continue;
		}

		const active = activeTestWorkers.get(message.testWorkerId);
		// It is possible for a message to have been buffering for so long — perhaps
		// due to the caller waiting before iterating to the next message — that the
		// test worker has been deregistered. Ignore such messages.
		//
		// (This is really hard to write a test for, however!)
		if (active === undefined) {
			continue;
		}

		let received = messageCache.get(message);
		if (received === undefined) {
			received = new ReceivedMessage(active.instance, message.messageId, message.data);
			messageCache.set(message, received);
		}

		yield received;
	}
}

let messageCounter = 0;
const messageIdPrefix = `${threadId}/message`;
const nextMessageId = () => `${messageIdPrefix}/${++messageCounter}`;

function publishMessage(testWorker, data, replyTo) {
	const id = nextMessageId();
	testWorker[internalMessagePort].postMessage({
		type: 'message',
		messageId: id,
		data,
		replyTo,
	});

	return {
		id,
		async * replies() {
			yield * receiveMessages(testWorker, id);
		},
	};
}

function broadcastMessage(data) {
	const id = nextMessageId();
	for (const trackedWorker of activeTestWorkers.values()) {
		trackedWorker.instance[internalMessagePort].postMessage({
			type: 'message',
			messageId: id,
			data,
		});
	}

	return {
		id,
		async * replies() {
			yield * receiveMessages(undefined, id);
		},
	};
}

async function loadFactory() {
	const {default: factory} = await import(workerData.filename);
	return factory;
}

let signalAvailable = () => {
	parentPort.postMessage({type: 'available'});
	signalAvailable = () => {};
};

let fatal;
try {
	const factory = await loadFactory(workerData.filename);
	if (typeof factory !== 'function') {
		throw new TypeError(`Missing default factory function export for shared worker plugin at ${workerData.filename}`);
	}

	factory({
		negotiateProtocol(supported) {
			if (!supported.includes('ava-4')) {
				fatal = new Error(`This version of AVA (${pkg.version}) is not compatible with shared worker plugin at ${workerData.filename}`);
				throw fatal;
			}

			const produceTestWorker = instance => events.emit('testWorker', instance);

			parentPort.on('message', async message => {
				if (message.type === 'register-test-worker') {
					const {id, file, port} = message;
					const instance = new TestWorker(id, file, port);

					activeTestWorkers.set(id, {instance, teardownFns: new Set()});

					produceTestWorker(instance);
					port.on('message', message => emitMessage({testWorkerId: id, ...message}));
				}

				if (message.type === 'deregister-test-worker') {
					const {id} = message;
					const {teardownFns} = activeTestWorkers.get(id);
					activeTestWorkers.delete(id);

					// Run possibly asynchronous release functions serially, in reverse
					// order. Any error will crash the worker.
					for await (const fn of [...teardownFns].reverse()) {
						await fn();
					}

					parentPort.postMessage({
						type: 'deregistered-test-worker',
						id,
					});

					emitMessage(message);
				}
			});

			return {
				initialData: workerData.initialData,
				protocol: 'ava-4',

				ready() {
					signalAvailable();
					return this;
				},

				broadcast(data) {
					return broadcastMessage(data);
				},

				async * subscribe() {
					yield * receiveMessages();
				},

				async * testWorkers() {
					for await (const [worker] of on(events, 'testWorker')) {
						yield worker;
					}
				},
			};
		},
	});
} catch (error) {
	fatal = fatal ?? error;
} finally {
	if (fatal !== undefined) {
		process.nextTick(() => {
			throw fatal;
		});
	}
}
