'use strict';
const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const Emittery = require('emittery');
const {controlFlow} = require('./ipc-flow-control');

if (fs.realpathSync(__filename) !== __filename) {
	console.warn('WARNING: `npm link ava` and the `--preserve-symlink` flag are incompatible. We have detected that AVA is linked via `npm link`, and that you are using either an early version of Node 6, or the `--preserve-symlink` flag. This breaks AVA. You should upgrade to Node 6.2.0+, avoid the `--preserve-symlink` flag, or avoid using `npm link ava`.');
}

// In case the test file imports a different AVA install,
// the presence of this variable allows it to require this one instead
const AVA_PATH = path.resolve(__dirname, '..');
const WORKER_PATH = require.resolve('./worker/subprocess');

class SharedWorkerChannel extends Emittery {
	constructor({channelId, filename, initialData}, sendToFork) {
		super();

		this.id = channelId;
		this.filename = filename;
		this.initialData = initialData;
		this.sendToFork = sendToFork;
	}

	signalReady() {
		this.sendToFork({
			type: 'shared-worker-ready',
			channelId: this.id
		});
	}

	signalError() {
		this.sendToFork({
			type: 'shared-worker-error',
			channelId: this.id
		});
	}

	emitMessage({messageId, replyTo, serializedData}) {
		this.emit('message', {
			messageId,
			replyTo,
			serializedData
		});
	}

	forwardMessageToFork({messageId, replyTo, serializedData}) {
		this.sendToFork({
			type: 'shared-worker-message',
			channelId: this.id,
			messageId,
			replyTo,
			serializedData
		});
	}
}

let forkCounter = 0;

module.exports = (file, options, execArgv = process.execArgv) => {
	const forkId = `fork/${++forkCounter}`;
	const sharedWorkerChannels = new Map();

	let finished = false;

	const emitter = new Emittery();
	const emitStateChange = evt => {
		if (!finished) {
			emitter.emit('stateChange', Object.assign(evt, {testFile: file}));
		}
	};

	options = {
		baseDir: process.cwd(),
		file,
		forkId,
		...options
	};

	const subprocess = childProcess.fork(WORKER_PATH, options.workerArgv, {
		cwd: options.projectDir,
		silent: true,
		env: {NODE_ENV: 'test', ...process.env, ...options.environmentVariables, AVA_PATH},
		execArgv
	});

	subprocess.stdout.on('data', chunk => {
		emitStateChange({type: 'worker-stdout', chunk});
	});

	subprocess.stderr.on('data', chunk => {
		emitStateChange({type: 'worker-stderr', chunk});
	});

	const bufferedSend = controlFlow(subprocess);

	let forcedExit = false;
	const send = evt => {
		if (!finished && !forcedExit) {
			bufferedSend({ava: evt});
		}
	};

	const promise = new Promise(resolve => {
		const finish = () => {
			finished = true;
			resolve();
		};

		subprocess.on('message', message => {
			if (!message.ava) {
				return;
			}

			switch (message.ava.type) {
				case 'ready-for-options':
					send({type: 'options', options});
					break;
				case 'shared-worker-connect': {
					const channel = new SharedWorkerChannel(message.ava, send);
					sharedWorkerChannels.set(channel.id, channel);
					emitter.emit('connectSharedWorker', channel);
					break;
				}

				case 'shared-worker-message':
					sharedWorkerChannels.get(message.ava.channelId).emitMessage(message.ava);
					break;
				case 'ping':
					send({type: 'pong'});
					break;
				default:
					emitStateChange(message.ava);
			}
		});

		subprocess.on('error', err => {
			emitStateChange({type: 'worker-failed', err});
			finish();
		});

		subprocess.on('exit', (code, signal) => {
			if (forcedExit) {
				emitStateChange({type: 'worker-finished', forcedExit});
			} else if (code > 0) {
				emitStateChange({type: 'worker-failed', nonZeroExitCode: code});
			} else if (code === null && signal) {
				emitStateChange({type: 'worker-failed', signal});
			} else {
				emitStateChange({type: 'worker-finished', forcedExit});
			}

			finish();
		});
	});

	return {
		file,
		forkId,
		promise,

		exit() {
			forcedExit = true;
			subprocess.kill();
		},

		notifyOfPeerFailure() {
			send({type: 'peer-failed'});
		},

		onConnectSharedWorker(listener) {
			return emitter.on('connectSharedWorker', listener);
		},

		onStateChange(listener) {
			return emitter.on('stateChange', listener);
		}
	};
};
