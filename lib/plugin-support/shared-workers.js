import events from 'node:events';
import {pathToFileURL} from 'node:url';
import {Worker} from 'node:worker_threads';

import serializeError from '../serialize-error.js';

const LOADER = new URL('shared-worker-loader.js', import.meta.url);

const launchedWorkers = new Map();

const waitForAvailable = async worker => {
	for await (const [message] of events.on(worker, 'message')) {
		if (message.type === 'available') {
			return;
		}
	}
};

function launchWorker(filename, initialData) {
	if (launchedWorkers.has(filename)) {
		return launchedWorkers.get(filename);
	}

	const worker = new Worker(LOADER, {
		// Ensure the worker crashes for unhandled rejections, rather than allowing undefined behavior.
		execArgv: ['--unhandled-rejections=strict'],
		workerData: {
			filename,
			initialData,
		},
	});
	worker.setMaxListeners(0);

	const launched = {
		statePromises: {
			available: waitForAvailable(worker),
			error: events.once(worker, 'error').then(([error]) => error),
		},
		exited: false,
		worker,
	};

	launchedWorkers.set(filename, launched);
	worker.once('exit', () => {
		launched.exited = true;
	});

	return launched;
}

export async function observeWorkerProcess(fork, runStatus) {
	let signalDone;

	const done = new Promise(resolve => {
		signalDone = () => {
			resolve();
		};
	});

	const activeInstances = new Set();

	const removeInstance = instance => {
		instance.worker.unref();
		activeInstances.delete(instance);

		if (activeInstances.size === 0) {
			signalDone();
		}
	};

	const removeAllInstances = () => {
		if (activeInstances.size === 0) {
			signalDone();
			return;
		}

		for (const instance of activeInstances) {
			removeInstance(instance);
		}
	};

	fork.promise.finally(() => {
		removeAllInstances();
	});

	fork.onConnectSharedWorker(async ({filename, initialData, port, signalError}) => {
		const launched = launchWorker(filename, initialData);
		activeInstances.add(launched);

		const handleWorkerMessage = async message => {
			if (message.type === 'deregistered-test-worker' && message.id === fork.threadId) {
				launched.worker.off('message', handleWorkerMessage);
				removeInstance(launched);
			}
		};

		launched.statePromises.error.then(error => {
			launched.worker.off('message', handleWorkerMessage);
			removeAllInstances();
			runStatus.emitStateChange({type: 'shared-worker-error', err: serializeError('Shared worker error', true, error)});
			signalError();
		});

		try {
			await launched.statePromises.available;

			port.postMessage({type: 'ready'});

			launched.worker.postMessage({
				type: 'register-test-worker',
				id: fork.threadId,
				file: pathToFileURL(fork.file).toString(),
				port,
			}, [port]);

			fork.promise.finally(() => {
				launched.worker.postMessage({
					type: 'deregister-test-worker',
					id: fork.threadId,
				});
			});

			launched.worker.on('message', handleWorkerMessage);
		} catch {}
	});

	return done;
}
