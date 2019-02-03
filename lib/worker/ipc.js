'use strict';
const Emittery = require('../emittery');

// `process.channel` was added in Node.js 7.1.0, but the channel was available
// through an undocumented API as `process._channel`.
const channel = process.channel || process._channel;

const emitter = new Emittery();
process.on('message', message => {
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
		case 'pong':
			emitter.emit('pong');
			break;
		default:
			break;
	}
});

exports.options = emitter.once('options');
exports.peerFailed = emitter.once('peerFailed');

function send(evt) {
	if (process.connected) {
		process.send({ava: evt});
	}
}

exports.send = send;

function unref() {
	channel.unref();
}

exports.unref = unref;

let pendingPings = Promise.resolve();
function flush() {
	channel.ref();
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
