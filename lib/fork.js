'use strict';
const {Worker, MessageChannel} = require('worker_threads');
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
const WORKER_PATH = require.resolve('./worker/base.js');
const noop = () => {};

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

const createWorker = (options, execArgv) => {
	let worker;
	let port;
	let postMessage;
	let close;
	if (options.workerThreads) {
		const {port1, port2} = new MessageChannel();
		worker = new Worker(WORKER_PATH, {
			argv: options.workerArgv,
			env: {NODE_ENV: 'test', ...process.env, ...options.environmentVariables, AVA_PATH},
			execArgv,
			workerData: {
				port: port1,
				cwd: options.projectDir
			},
			transferList: [port1],
			trackUnmanagedFds: true,
			stdin: true,
			stdout: true,
			stderr: true
		});
		port = port2;
		postMessage = (...args) => port2.postMessage(...args);
		close = () => {
			worker.terminate().then(noop, noop); // eslint-disable-line promise/prefer-await-to-then
		};
	} else {
		worker = childProcess.fork(WORKER_PATH, options.workerArgv, {
			cwd: options.projectDir,
			silent: true,
			env: {NODE_ENV: 'test', ...process.env, ...options.environmentVariables, AVA_PATH},
			execArgv
		});
		port = worker;
		postMessage = controlFlow(worker);
		close = () => worker.kill();
	}

	return {
		worker,
		port,
		postMessage,
		close
	};
};

module.exports = (file, options, execArgv = process.execArgv) => {
	// TODO: this can be changed to use `threadId` when using worker_threads
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

	const {worker, port, postMessage, close} = createWorker(options, execArgv);
	worker.stdout.on('data', chunk => {
		emitStateChange({type: 'worker-stdout', chunk});
	});

	worker.stderr.on('data', chunk => {
		emitStateChange({type: 'worker-stderr', chunk});
	});

	let forcedExit = false;
	const send = evt => {
		if (!finished && !forcedExit) {
			postMessage({ava: evt});
		}
	};

	const promise = new Promise(resolve => {
		const finish = () => {
			finished = true;
			resolve();
		};

		port.on('message', message => {
			if (!message.ava) {
				return;
			}

			switch (message.ava.type) {
				case 'ready-for-options': {
					let options_ = options;
					if (options.workerThreads) {
						// Removing `providers` field because functions cannot be transfered in MessageChannel
						const {providers, ...cleaned} = options;
						options_ = cleaned;
					}

					send({type: 'options', options: options_});
					break;
				}

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

		worker.on('error', error => {
			emitStateChange({type: 'worker-failed', err: error});
			finish();
		});

		worker.on('exit', (code, signal) => {
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
			close();
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
