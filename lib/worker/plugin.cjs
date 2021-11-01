const pkg = require('../../package.json');

const {registerSharedWorker: register} = require('./channel.cjs');
const options = require('./options.cjs');
const {sharedWorkerTeardowns, waitForReady} = require('./state.cjs');

require('./guard-environment.cjs'); // eslint-disable-line import/no-unassigned-import

const workers = new Map();
const workerTeardownFns = new WeakMap();

function createSharedWorker(filename, initialData, teardown) {
	const {channel, forceUnref, ready} = register(filename, initialData, teardown);
	waitForReady.push(ready);
	sharedWorkerTeardowns.push(async () => {
		try {
			await teardown();
		} finally {
			forceUnref();
		}
	});

	class ReceivedMessage {
		constructor(id, data) {
			this.id = id;
			this.data = data;
		}

		reply(data) {
			return publishMessage(data, this.id);
		}
	}

	// Ensure that, no matter how often it's received, we have a stable message
	// object.
	const messageCache = new WeakMap();
	async function * receiveMessages(replyTo) {
		for await (const evt of channel.receive()) {
			if (replyTo === undefined && evt.replyTo !== undefined) {
				continue;
			}

			if (replyTo !== undefined && evt.replyTo !== replyTo) {
				continue;
			}

			let message = messageCache.get(evt);
			if (message === undefined) {
				message = new ReceivedMessage(evt.messageId, evt.data);
				messageCache.set(evt, message);
			}

			yield message;
		}
	}

	function publishMessage(data, replyTo) {
		const id = channel.post(data, replyTo);

		return {
			id,
			async * replies() {
				yield * receiveMessages(id);
			},
		};
	}

	return {
		available: channel.available,
		protocol: 'ava-4',

		get currentlyAvailable() {
			return channel.currentlyAvailable;
		},

		publish(data) {
			return publishMessage(data);
		},

		async * subscribe() {
			yield * receiveMessages();
		},
	};
}

function registerSharedWorker({
	filename,
	initialData,
	supportedProtocols,
	teardown,
}) {
	const options_ = options.get();

	if (!options_.workerThreads) {
		throw new Error('Shared workers can be used only when worker threads are enabled');
	}

	if (!supportedProtocols.includes('ava-4')) {
		throw new Error(`This version of AVA (${pkg.version}) does not support any of the desired shared worker protocols: ${supportedProtocols.join(',')}`);
	}

	filename = String(filename); // Allow URL instances.

	let worker = workers.get(filename);
	if (worker === undefined) {
		worker = createSharedWorker(filename, initialData, async () => {
			// Run possibly asynchronous teardown functions serially, in reverse
			// order. Any error will crash the worker.
			const teardownFns = workerTeardownFns.get(worker);
			if (teardownFns !== undefined) {
				for await (const fn of [...teardownFns].reverse()) {
					await fn();
				}
			}
		});
		workers.set(filename, worker);
	}

	if (teardown !== undefined) {
		if (workerTeardownFns.has(worker)) {
			workerTeardownFns.get(worker).push(teardown);
		} else {
			workerTeardownFns.set(worker, [teardown]);
		}
	}

	return worker;
}

exports.registerSharedWorker = registerSharedWorker;
