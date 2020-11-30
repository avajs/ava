const {EventEmitter, on} = require('events');
const v8 = require('v8');
const {workerData, parentPort} = require('worker_threads');
const pkg = require('../../package.json');

// Used to forward messages received over the `parentPort`. Every subscription
// adds a listener, so do not enforce any maximums.
const events = new EventEmitter().setMaxListeners(0);

// Map of active test workers, used in receiveMessages() to get a reference to
// the TestWorker instance, and relevant release functions.
const activeTestWorkers = new Map();

class TestWorker {
	constructor(id, file) {
		this.id = id;
		this.file = file;
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
	constructor(testWorker, id, serializedData) {
		this.testWorker = testWorker;
		this.id = id;
		this.data = v8.deserialize(new Uint8Array(serializedData));
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
			received = new ReceivedMessage(active.instance, message.messageId, message.serializedData);
			messageCache.set(message, received);
		}

		yield received;
	}
}

let messageCounter = 0;
const messageIdPrefix = `${workerData.id}/message`;
const nextMessageId = () => `${messageIdPrefix}/${++messageCounter}`;

function publishMessage(testWorker, data, replyTo) {
	const id = nextMessageId();
	parentPort.postMessage({
		type: 'message',
		messageId: id,
		testWorkerId: testWorker.id,
		serializedData: [...v8.serialize(data)],
		replyTo
	});

	return {
		id,
		async * replies() {
			yield * receiveMessages(testWorker, id);
		}
	};
}

function broadcastMessage(data) {
	const id = nextMessageId();
	parentPort.postMessage({
		type: 'broadcast',
		messageId: id,
		serializedData: [...v8.serialize(data)]
	});

	return {
		id,
		async * replies() {
			yield * receiveMessages(undefined, id);
		}
	};
}

async function loadFactory() {
	try {
		const mod = require(workerData.filename);
		if (typeof mod === 'function') {
			return mod;
		}

		return mod.default;
	} catch (error) {
		if (error && (error.code === 'ERR_REQUIRE_ESM' || (error.code === 'MODULE_NOT_FOUND' && workerData.filename.startsWith('file://')))) {
			const {default: factory} = await import(workerData.filename); // eslint-disable-line node/no-unsupported-features/es-syntax
			return factory;
		}

		throw error;
	}
}

let signalAvailable = () => {
	parentPort.postMessage({type: 'available'});
	signalAvailable = () => {};
};

let fatal;
loadFactory(workerData.filename).then(factory => {
	if (typeof factory !== 'function') {
		throw new TypeError(`Missing default factory function export for shared worker plugin at ${workerData.filename}`);
	}

	factory({
		negotiateProtocol(supported) {
			if (!supported.includes('experimental')) {
				fatal = new Error(`This version of AVA (${pkg.version}) is not compatible with shared worker plugin at ${workerData.filename}`);
				throw fatal;
			}

			const produceTestWorker = instance => events.emit('testWorker', instance);

			parentPort.on('message', async message => {
				if (message.type === 'register-test-worker') {
					const {id, file} = message;
					const instance = new TestWorker(id, file);

					activeTestWorkers.set(id, {instance, teardownFns: new Set()});

					produceTestWorker(instance);
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
						id
					});
				}

				// Wait for a turn of the event loop, to allow new subscriptions to be
				// set up in response to the previous message.
				setImmediate(() => events.emit('message', message));
			});

			return {
				initialData: workerData.initialData,
				protocol: 'experimental',

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
				}
			};
		}
	});
}).catch(error => {
	if (fatal === undefined) {
		fatal = error;
	}
}).finally(() => {
	if (fatal !== undefined) {
		process.nextTick(() => {
			throw fatal;
		});
	}
});
