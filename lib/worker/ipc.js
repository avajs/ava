'use strict';
const events = require('events');
const pEvent = require('p-event');
const {controlFlow} = require('../ipc-flow-control');
const {get: getOptions} = require('./options');

const selectAvaMessage = type => message => message.ava && message.ava.type === type;

exports.options = pEvent(process, 'message', selectAvaMessage('options')).then(message => message.ava.options);
exports.peerFailed = pEvent(process, 'message', selectAvaMessage('peer-failed'));

const bufferedSend = controlFlow(process);
function send(evt) {
	bufferedSend({ava: evt});
}

exports.send = send;

let refs = 1;
function ref() {
	if (++refs === 1) {
		process.channel.ref();
	}
}

function unref() {
	if (refs > 0 && --refs === 0) {
		process.channel.unref();
	}
}

exports.unref = unref;

let pendingPings = Promise.resolve();
async function flush() {
	ref();
	const promise = pendingPings.then(async () => { // eslint-disable-line promise/prefer-await-to-then
		send({type: 'ping'});
		await pEvent(process, 'message', selectAvaMessage('pong'));
		if (promise === pendingPings) {
			unref();
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
		process.on('message', message => {
			if (!message.ava) {
				return;
			}

			const {channelId, type, ...payload} = message.ava;
			if (
				type === 'shared-worker-error' ||
				type === 'shared-worker-message' ||
				type === 'shared-worker-ready'
			) {
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
	const channelId = `${getOptions().forkId}/channel/${++channelCounter}`;
	const [channelEmitter, unsubscribe] = createChannelEmitter(channelId);

	let forcedUnref = false;
	let refs = 0;
	const forceUnref = () => {
		if (forcedUnref) {
			return;
		}

		forcedUnref = true;
		if (refs > 0) {
			unref();
		}
	};

	const refChannel = () => {
		if (!forcedUnref && ++refs === 1) {
			ref();
		}
	};

	const unrefChannel = () => {
		if (!forcedUnref && refs > 0 && --refs === 0) {
			unref();
		}
	};

	send({
		type: 'shared-worker-connect',
		channelId,
		filename,
		initialData
	});

	let currentlyAvailable = false;
	let error = null;

	refChannel();
	const ready = pEvent(channelEmitter, 'shared-worker-ready').then(() => { // eslint-disable-line promise/prefer-await-to-then
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

	channelEmitter.on('shared-worker-message', handleMessage);

	pEvent(channelEmitter, 'shared-worker-error').then(() => { // eslint-disable-line promise/prefer-await-to-then
		unsubscribe();
		forceUnref();

		error = new Error('The shared worker is no longer available');
		currentlyAvailable = false;
		for (const emitter of messageEmitters) {
			emitter.emit('error', error);
		}
	});

	return {
		forceUnref,
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
					refChannel();
					for await (const [message] of events.on(emitter, 'message')) {
						yield message;
					}
				} finally {
					unrefChannel();
					messageEmitters.delete(emitter);
				}
			},

			post(serializedData, replyTo) {
				if (error !== null) {
					throw error;
				}

				if (!currentlyAvailable) {
					throw new Error('Shared worker is not yet available');
				}

				const messageId = `${channelId}/message/${++messageCounter}`;
				send({
					type: 'shared-worker-message',
					channelId,
					messageId,
					replyTo,
					serializedData
				});

				return messageId;
			}
		}
	};
}

exports.registerSharedWorker = registerSharedWorker;

