const events = require('events');
const serializeError = require('../serialize-error');

let Worker;
try {
	({Worker} = require('worker_threads'));
} catch {}

const LOADER = require.resolve('./shared-worker-loader');

let sharedWorkerCounter = 0;
const launchedWorkers = new Map();

const waitForAvailable = async worker => {
	for await (const [message] of events.on(worker, 'message')) {
		if (message.type === 'available') {
			return;
		}
	}
};

function launchWorker({filename, initialData}) {
	if (launchedWorkers.has(filename)) {
		return launchedWorkers.get(filename);
	}

	const id = `shared-worker/${++sharedWorkerCounter}`;
	const worker = new Worker(LOADER, {
		// Ensure the worker crashes for unhandled rejections, rather than allowing undefined behavior.
		execArgv: ['--unhandled-rejections=strict'],
		workerData: {
			filename,
			id,
			initialData
		}
	});
	worker.setMaxListeners(0);

	const launched = {
		statePromises: {
			available: waitForAvailable(worker),
			error: events.once(worker, 'error').then(([error]) => error) // eslint-disable-line promise/prefer-await-to-then
		},
		exited: false,
		worker
	};

	launchedWorkers.set(filename, launched);
	worker.once('exit', () => {
		launched.exited = true;
	});

	return launched;
}

async function observeWorkerProcess(fork, runStatus) {
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

	fork.onConnectSharedWorker(async channel => {
		const launched = launchWorker(channel);

		const handleChannelMessage = ({messageId, replyTo, serializedData}) => {
			launched.worker.postMessage({
				type: 'message',
				testWorkerId: fork.forkId,
				messageId,
				replyTo,
				serializedData
			});
		};

		const handleWorkerMessage = async message => {
			if (message.type === 'broadcast' || (message.type === 'message' && message.testWorkerId === fork.forkId)) {
				const {messageId, replyTo, serializedData} = message;
				channel.forwardMessageToFork({messageId, replyTo, serializedData});
			}

			if (message.type === 'deregistered-test-worker' && message.id === fork.forkId) {
				launched.worker.off('message', handleWorkerMessage);

				registrationCount--;
				if (registrationCount === 0) {
					signalDeregistered();
				}
			}
		};

		launched.statePromises.error.then(error => { // eslint-disable-line promise/prefer-await-to-then
			signalDeregistered();
			launched.worker.off('message', handleWorkerMessage);
			runStatus.emitStateChange({type: 'shared-worker-error', err: serializeError('Shared worker error', true, error)});
			channel.signalError();
		});

		try {
			await launched.statePromises.available;

			registrationCount++;
			launched.worker.postMessage({
				type: 'register-test-worker',
				id: fork.forkId,
				file: fork.file
			});

			fork.promise.finally(() => {
				launched.worker.postMessage({
					type: 'deregister-test-worker',
					id: fork.forkId
				});

				channel.off('message', handleChannelMessage);
			});

			launched.worker.on('message', handleWorkerMessage);
			channel.on('message', handleChannelMessage);
			channel.signalReady();
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

exports.observeWorkerProcess = observeWorkerProcess;
