'use strict';
const Emittery = require('emittery');

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
	process.channel.unref();
}

exports.unref = unref;

let pendingPings = Promise.resolve();
async function flush() {
	process.channel.ref();
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
