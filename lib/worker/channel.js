'use strict';
const events = require('events');
const pEvent = require('p-event');
const {get: getOptions} = require('./options');
const {isRunningInChildProcess, isRunningInThread} = require('./utils');
const selectAvaMessage = type => message => message.ava && message.ava.type === type;

let controlFlow;

class Handle {
	constructor() {
		this._refs = 1;
	}

	_ref() {}
	_unref() {}
	ref() {
		if (++this._refs === 1) {
			this._ref();
		}
	}

	unref() {
		if (this._refs > 0 && --this._refs === 0) {
			this._unref();
		}
	}

	send() {}
}

class MessagePortHandle extends Handle {
	constructor(port) {
		super();
		this.channel = port;
	}

	_ref() {
		this.channel.ref();
	}

	_unref() {
		this.channel.unref();
	}

	send(evt) {
		this.channel.postMessage({ava: evt});
	}
}

class IPCHandle extends Handle {
	constructor() {
		super();
		this.channel = process;
		this._bufferedSend = controlFlow(process);
	}

	_ref() {
		process.channel.ref();
	}

	_unref() {
		process.channel.unref();
	}

	send(evt) {
		this._bufferedSend({ava: evt});
	}
}

let handle;
if (isRunningInChildProcess) {
	controlFlow = require('../ipc-flow-control').controlFlow;
	handle = new IPCHandle();
} else if (isRunningInThread) {
	const {parentPort} = require('worker_threads');
	handle = new MessagePortHandle(parentPort);
}

exports.options = pEvent(handle.channel, 'message', selectAvaMessage('options')).then(message => message.ava.options);
exports.peerFailed = pEvent(handle.channel, 'message', selectAvaMessage('peer-failed'));
exports.send = handle.send.bind(handle);
exports.unref = handle.unref.bind(handle);

let pendingPings = Promise.resolve();
async function flush() {
	handle.ref();
	const promise = pendingPings.then(async () => { // eslint-disable-line promise/prefer-await-to-then
		handle.send({type: 'ping'});
		await pEvent(handle.channel, 'message', selectAvaMessage('pong'));
		if (promise === pendingPings) {
			handle.unref();
		}
	});
	pendingPings = promise;
	await promise;
}

exports.flush = flush;

let channelCounter = 0;
let messageCounter = 0;

function registerSharedWorker(filename, initialData) {
	const {forkId} = getOptions();
	const channelId = `${forkId}/channel/${++channelCounter}`;

	let forcedUnref = false;
	let refs = 0;
	const forceUnref = () => {
		if (forcedUnref) {
			return;
		}

		forcedUnref = true;
		if (refs > 0) {
			handle.unref();
		}
	};

	const refChannel = () => {
		if (!forcedUnref && ++refs === 1) {
			handle.ref();
		}
	};

	const unrefChannel = () => {
		if (!forcedUnref && refs > 0 && --refs === 0) {
			handle.unref();
		}
	};

	handle.send({
		type: 'shared-worker-connect',
		channelId,
		filename,
		initialData
	});

	let currentlyAvailable = false;
	let error = null;

	refChannel();
	const ready = pEvent(handle.channel, 'message', selectAvaMessage('shared-worker-ready')).then(() => { // eslint-disable-line promise/prefer-await-to-then
		currentlyAvailable = error === null;
	}).finally(unrefChannel);

	const messageEmitters = new Set();
	const handleMessage = message => {
		// Wait for a turn of the event loop, to allow new subscriptions to be set
		// up in response to the previous message.
		setImmediate(() => {
			for (const emitter of messageEmitters) {
				emitter.emit('message', message);
			}
		});
	};

	let sharedWorkerHandle;
	const setupPort = port => {
		sharedWorkerHandle = new MessagePortHandle(port);
		const onMessage = message => {
			switch (message.type) {
				case 'broadcast':
				case 'message': {
					handleMessage(message);
					break;
				}

				default:
					break;
			}
		};

		port.on('message', onMessage);
	};

	handle.channel.on('message', message => {
		if (!(message.ava && message.ava.type)) {
			return;
		}

		switch (message.ava.type) {
			case 'shared-worker-port': {
				setupPort(message.ava.port);
				break;
			}

			case 'shared-worker-error': {
				if (message.ava.channelId === channelId) {
					forceUnref();
					error = new Error('The shared worker is no longer available');
					currentlyAvailable = false;
					for (const emitter of messageEmitters) {
						emitter.emit('error', error);
					}
				}

				break;
			}

			default: {
				break;
			}
		}
	});

	let sharedWorkerForcedUnref = false;
	let sharedWorkerRefs = 0;
	const sharedWorkerForceUnref = () => {
		if (!sharedWorkerHandle) {
			return;
		}

		if (sharedWorkerForcedUnref) {
			return;
		}

		sharedWorkerForcedUnref = true;
		if (sharedWorkerRefs > 0) {
			sharedWorkerHandle.unref();
		}
	};

	const sharedWorkerRefChannel = () => {
		if (!sharedWorkerHandle) {
			return;
		}

		if (!sharedWorkerForcedUnref && ++sharedWorkerRefs === 1) {
			sharedWorkerHandle.ref();
		}
	};

	const sharedWorkerUnrefChannel = () => {
		if (!sharedWorkerHandle) {
			return;
		}

		if (!sharedWorkerForcedUnref && sharedWorkerRefs > 0 && --sharedWorkerRefs === 0) {
			sharedWorkerHandle.unref();
		}
	};

	return {
		forceUnref: sharedWorkerForceUnref,
		ready,
		channel: {
			available: ready,

			get currentlyAvailable() {
				return currentlyAvailable;
			},

			async * receive() {
				if (error !== null) {
					throw error;
				}

				const emitter = new events.EventEmitter();
				messageEmitters.add(emitter);
				try {
					sharedWorkerRefChannel();
					for await (const [message] of events.on(emitter, 'message')) {
						yield message;
					}
				} finally {
					sharedWorkerUnrefChannel();
					messageEmitters.delete(emitter);
				}
			},

			post(data, replyTo) {
				if (error !== null) {
					throw error;
				}

				if (!currentlyAvailable) {
					throw new Error('Shared worker is not yet available');
				}

				const messageId = `${channelId}/message/${++messageCounter}`;
				sharedWorkerHandle.send({
					testWorkerId: forkId,
					type: 'message',
					channelId,
					messageId,
					replyTo,
					data
				});

				return messageId;
			}
		}
	};
}

exports.registerSharedWorker = registerSharedWorker;
