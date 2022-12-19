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

/**
 * Handles the shared worker lifecycle within a test worker thread.
 */
export async function observeWorkerProcess(fork, runStatus) {
	let signalAllDeregistered;

	const launchedSharedWorkerMap = new Map();

	/**
	 * If a filename is provided, unreferences the shared worker associated with that filename. Otherwise unreferences all shared workers.
	 * Resolves the main de-registration promise if all shared workers have been unregistered.
	 */
	const deregisterSharedWorker = filename => {
		if (filename) {
			launchedSharedWorkerMap.get(filename)?.worker.unref();
			launchedSharedWorkerMap.delete(filename);
		} else {
			for (const filename of launchedSharedWorkerMap.keys()) {
				deregisterSharedWorker(filename);
			}
		}

		if (launchedSharedWorkerMap.size === 0) {
			signalAllDeregistered();
		}
	};

	const deregistered = new Promise(resolve => {
		signalAllDeregistered = () => {
			resolve();
		};
	});

	fork.promise.finally(() => {
		deregisterSharedWorker();
	});

	fork.onConnectSharedWorker(async ({filename, initialData, port, signalError}) => {
		const launched = launchWorker(filename, initialData);

		launchedSharedWorkerMap.set(filename, launched);

		const handleWorkerMessage = async message => {
			if (message.type === 'deregistered-test-worker' && message.id === fork.threadId) {
				deregisterSharedWorker(filename);
			}
		};

		launched.statePromises.error.then(error => {
			launched.worker.off('message', handleWorkerMessage);
			deregisterSharedWorker(filename);
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

	return deregistered;
}
