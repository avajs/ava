'use strict';
const Emittery = require('../emittery');
const {usingWorker} = require('./options').get();

// `process.channel` was added in Node.js 7.1.0, but the channel was available
// through an undocumented API as `process._channel`.
let channel = {ref() {}, unref() {}};
let _process = process;

if (usingWorker) {
	/* eslint-disable-next-line import/no-unresolved */
	const {parentPort} = require('worker_threads');
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

exports.peerFailed = emitter.once('peerFailed');
exports.newFile = listener => emitter.on('newFile', listener);

function send(evt) {
	if (_process.connected) {
		if (usingWorker) {
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
function flush() {
	if (!usingWorker) {
		channel.ref();
	}

	const promise = pendingPings.then(() => {
		send({type: 'ping'});
		return emitter.once('pong');
	}).then(() => {
		if (promise === pendingPings) {
			unref();
		}
	});
	pendingPings = promise;
	return promise;
}

exports.flush = flush;
