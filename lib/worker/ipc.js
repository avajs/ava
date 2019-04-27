'use strict';
const Emittery = require('emittery');

let parentPort;
let usingWorker = false;

/* istanbul ignore next */
try {
	/* eslint-disable-next-line import/no-unresolved */
	const {parentPort: _parentPort, workerData} = require('worker_threads');
	parentPort = _parentPort;
	usingWorker = workerData.isWorker;
} catch (_) {}

// `process.channel` was added in Node.js 7.1.0, but the channel was available
// through an undocumented API as `process._channel`.
let channel = {ref() {}, unref() {}};
let _process = process;

/* istanbul ignore next */
if (usingWorker) {
	channel = parentPort;
	_process = parentPort;
	_process.connected = true;
} else {
	channel = process.channel || process._channel;
}

const emitter = new Emittery();
_process.on('message', message => {
	if (!message.ava) {
		return;
	}

	switch (message.ava.type) {
		case 'options':
			emitter.emit('options', message.ava.options);
			break;
		case 'peer-failed':
			emitter.emit('peerFailed');
			break;
		case 'new-file':
			emitter.emit('newFile', message.ava.file);
			break;
		case 'pong':
			emitter.emit('pong');
			break;
		default:
			break;
	}
});

exports.options = emitter.once('options');
exports.peerFailed = emitter.once('peerFailed');
exports.newFile = listener => emitter.on('newFile', listener);

function send(evt) {
	if (_process.connected) {
		if (usingWorker) {
			/* istanbul ignore next */
			_process.postMessage({ava: evt});
		} else {
			_process.send({ava: evt});
		}
	}
}

exports.send = send;

function unref() {
	channel.unref();
}

exports.unref = unref;

let pendingPings = Promise.resolve();
async function flush() {
	if (!usingWorker) {
		channel.ref();
	}

	const promise = pendingPings.then(async () => { // eslint-disable-line promise/prefer-await-to-then
		send({type: 'ping'});
		await emitter.once('pong');
		if (promise === pendingPings) {
			unref();
		}
	});
	pendingPings = promise;
	await promise;
}

exports.flush = flush;
