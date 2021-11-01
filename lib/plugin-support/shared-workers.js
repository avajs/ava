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
	let registrationCount = 0;
	let signalDeregistered;
	const deregistered = new Promise(resolve => {
		signalDeregistered = resolve;
	});

	fork.promise.finally(() => {
		if (registrationCount === 0) {
			signalDeregistered();
		}
	});

	fork.onConnectSharedWorker(async ({filename, initialData, port, signalError}) => {
		const launched = launchWorker(filename, initialData);

		const handleWorkerMessage = async message => {
			if (message.type === 'deregistered-test-worker' && message.id === fork.threadId) {
				launched.worker.off('message', handleWorkerMessage);

				registrationCount--;
				if (registrationCount === 0) {
					signalDeregistered();
				}
			}
		};

		launched.statePromises.error.then(error => {
			signalDeregistered();
			launched.worker.off('message', handleWorkerMessage);
			runStatus.emitStateChange({type: 'shared-worker-error', err: serializeError('Shared worker error', true, error)});
			signalError();
		});

		try {
			await launched.statePromises.available;

			registrationCount++;

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
		} catch {
			return;
		} finally {
			// Attaching listeners has the side-effect of referencing the worker.
			// Explicitly unreference it now so it does not prevent the main process
			// from exiting.
			launched.worker.unref();
		}
	});

	return deregistered;
}
