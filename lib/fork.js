import childProcess from 'node:child_process';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';

import Emittery from 'emittery';
import {pEvent} from 'p-event';

import {controlFlow} from './ipc-flow-control.cjs';
import serializeError from './serialize-error.js';

let workerPath = new URL('worker/base.js', import.meta.url);
export function _testOnlyReplaceWorkerPath(replacement) {
	workerPath = replacement;
}

const additionalExecArgv = ['--enable-source-maps'];

const createWorker = (options, execArgv) => {
	let worker;
	let postMessage;
	let close;
	if (options.workerThreads) {
		worker = new Worker(workerPath, {
			argv: options.workerArgv,
			env: {NODE_ENV: 'test', ...process.env, ...options.environmentVariables},
			execArgv: [...execArgv, ...additionalExecArgv],
			workerData: {
				options,
			},
			trackUnmanagedFds: true,
			stdin: true,
			stdout: true,
			stderr: true,
		});
		postMessage = worker.postMessage.bind(worker);

		// Ensure we've seen this event before we terminate the worker thread, as a
		// workaround for https://github.com/nodejs/node/issues/38418.
		const starting = pEvent(worker, 'message', ({ava}) => ava && ava.type === 'starting');

		close = async () => {
			try {
				await starting;
				await worker.terminate();
			} finally {
				// No-op
			}
		};
	} else {
		worker = childProcess.fork(fileURLToPath(workerPath), options.workerArgv, {
			cwd: options.projectDir,
			silent: true,
			env: {NODE_ENV: 'test', ...process.env, ...options.environmentVariables},
			execArgv: [...execArgv, ...additionalExecArgv],
		});
		postMessage = controlFlow(worker);
		close = async () => worker.kill();
	}

	return {
		worker,
		postMessage,
		close,
	};
};

export default function loadFork(file, options, execArgv = process.execArgv) {
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
		...options,
	};

	const {worker, postMessage, close} = createWorker(options, execArgv);
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

		worker.on('message', message => {
			if (!message.ava) {
				return;
			}

			switch (message.ava.type) {
				case 'ready-for-options':
					send({type: 'options', options});
					break;
				case 'shared-worker-connect': {
					const {channelId, filename, initialData, port} = message.ava;
					emitter.emit('connectSharedWorker', {
						filename,
						initialData,
						port,
						signalError() {
							send({type: 'shared-worker-error', channelId});
						},
					});
					break;
				}

				case 'ping':
					send({type: 'pong'});
					break;
				default:
					emitStateChange(message.ava);
			}
		});

		worker.on('error', error => {
			emitStateChange({type: 'worker-failed', err: serializeError('Worker error', false, error, file)});
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
		threadId: worker.threadId,
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
		},
	};
}
