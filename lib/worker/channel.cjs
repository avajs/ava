'use strict';
const events = require('events');
const process = require('process');
const {MessageChannel, threadId} = require('worker_threads');

const timers = require('../now-and-timers.cjs');

const {isRunningInChildProcess, isRunningInThread} = require('./utils.cjs');

let pEvent = async (emitter, event, options) => {
	// We need to import p-event, but import() is asynchronous. Buffer any events
	// emitted in the meantime. Don't handle errors.
	const buffer = [];
	const addToBuffer = (...args) => buffer.push(args);
	emitter.on(event, addToBuffer);

	try {
		({pEvent} = await import('p-event')); // eslint-disable-line node/no-unsupported-features/es-syntax
	} finally {
		emitter.off(event, addToBuffer);
	}

	if (buffer.length === 0) {
		return pEvent(emitter, event, options);
	}

	// Now replay buffered events.
	const replayEmitter = new events.EventEmitter();
	const promise = pEvent(replayEmitter, event, options);
	for (const args of buffer) {
		replayEmitter.emit(event, ...args);
	}

	const replay = (...args) => replayEmitter.emit(event, ...args);
	emitter.on(event, replay);

	try {
		return await promise;
	} finally {
		emitter.off(event, replay);
	}
};

const selectAvaMessage = type => message => message.ava && message.ava.type === type;

class RefCounter {
	constructor() {
		this.count = 0;
	}

	refAndTest() {
		return ++this.count === 1;
	}

	testAndUnref() {
		return this.count > 0 && --this.count === 0;
	}
}

class MessagePortHandle {
	constructor(port) {
		this.counter = new RefCounter();
		this.unreferenceable = false;
		this.channel = port;
		// Referencing the port does not immediately prevent the thread from
		// exiting. Use a timer to keep a reference for at least a second.
		this.workaroundTimer = timers.setTimeout(() => {}, 1000).unref();
	}

	forceUnref() {
		if (this.unreferenceable) {
			return;
		}

		this.unreferenceable = true;
		this.workaroundTimer.unref();
		this.channel.unref();
	}

	ref() {
		if (!this.unreferenceable && this.counter.refAndTest()) {
			this.workaroundTimer.refresh().ref();
			this.channel.ref();
		}
	}

	unref() {
		if (!this.unreferenceable && this.counter.testAndUnref()) {
			this.workaroundTimer.unref();
			this.channel.unref();
		}
	}

	send(evt, transferList) {
		this.channel.postMessage({ava: evt}, transferList);
	}
}

class IpcHandle {
	constructor(bufferedSend) {
		this.counter = new RefCounter();
		this.channel = process;
		this.sendRaw = bufferedSend;
	}

	ref() {
		if (this.counter.refAndTest()) {
			process.channel.ref();
		}
	}

	unref() {
		if (this.counter.testAndUnref()) {
			process.channel.unref();
		}
	}

	send(evt) {
		this.sendRaw({ava: evt});
	}
}

let handle;
if (isRunningInChildProcess) {
	const {controlFlow} = require('../ipc-flow-control.cjs');
	handle = new IpcHandle(controlFlow(process));
} else if (isRunningInThread) {
	const {parentPort} = require('worker_threads');
	handle = new MessagePortHandle(parentPort);
}

// The attaching of message listeners will cause the port to be referenced by
// Node.js. In order to keep track, explicitly reference before attaching.
handle.ref();

exports.options = pEvent(handle.channel, 'message', selectAvaMessage('options')).then(message => message.ava.options);
exports.peerFailed = pEvent(handle.channel, 'message', selectAvaMessage('peer-failed'));
exports.send = handle.send.bind(handle);
exports.unref = handle.unref.bind(handle);

let pendingPings = Promise.resolve();
async function flush() {
	handle.ref();
	const promise = pendingPings.then(async () => {
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

const channelEmitters = new Map();
function createChannelEmitter(channelId) {
	if (channelEmitters.size === 0) {
		handle.channel.on('message', message => {
			if (!message.ava) {
				return;
			}

			const {channelId, type, ...payload} = message.ava;
			if (type === 'shared-worker-error') {
				const emitter = channelEmitters.get(channelId);
				if (emitter !== undefined) {
					emitter.emit(type, payload);
				}
			}
		});
	}

	const emitter = new events.EventEmitter();
	channelEmitters.set(channelId, emitter);
	return [emitter, () => channelEmitters.delete(channelId)];
}

function registerSharedWorker(filename, initialData) {
	const channelId = `${threadId}/channel/${++channelCounter}`;

	const {port1: ourPort, port2: theirPort} = new MessageChannel();
	const sharedWorkerHandle = new MessagePortHandle(ourPort);

	const [channelEmitter, unsubscribe] = createChannelEmitter(channelId);

	handle.send({
		type: 'shared-worker-connect',
		channelId,
		filename,
		initialData,
		port: theirPort,
	}, [theirPort]);

	let currentlyAvailable = false;
	let error = null;

	// The attaching of message listeners will cause the port to be referenced by
	// Node.js. In order to keep track, explicitly reference before attaching.
	sharedWorkerHandle.ref();
	const ready = pEvent(ourPort, 'message', ({type}) => type === 'ready').then(() => {
		currentlyAvailable = error === null;
	}).finally(() => {
		// Once ready, it's up to user code to subscribe to messages, which (see
		// below) causes us to reference the port.
		sharedWorkerHandle.unref();
	});

	const messageEmitters = new Set();

	// Errors are received over the test worker channel, not the message port
	// dedicated to the shared worker.
	pEvent(channelEmitter, 'shared-worker-error').then(() => {
		unsubscribe();
		sharedWorkerHandle.forceUnref();
		error = new Error('The shared worker is no longer available');
		currentlyAvailable = false;
		for (const emitter of messageEmitters) {
			emitter.emit('error', error);
		}
	});

	ourPort.on('message', message => {
		if (message.type === 'message') {
			// Wait for a turn of the event loop, to allow new subscriptions to be set
			// up in response to the previous message.
			setImmediate(() => {
				for (const emitter of messageEmitters) {
					emitter.emit('message', message);
				}
			});
		}
	});

	return {
		forceUnref: () => sharedWorkerHandle.forceUnref(),
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
					sharedWorkerHandle.ref();
					for await (const [message] of events.on(emitter, 'message')) {
						yield message;
					}
				} finally {
					sharedWorkerHandle.unref();
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
				ourPort.postMessage({
					type: 'message',
					messageId,
					replyTo,
					data,
				});

				return messageId;
			},
		},
	};
}

exports.registerSharedWorker = registerSharedWorker;
