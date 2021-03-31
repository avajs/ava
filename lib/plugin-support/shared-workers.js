const events = require('events');
const {Worker, MessageChannel} = require('worker_threads');
const serializeError = require('../serialize-error');

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

async function launchWorker({filename, initialData}) {
	// TODO: remove the custom id and use the built-in thread id.
	if (launchedWorkers.has(filename)) {
		return launchedWorkers.get(filename);
	}

	const id = `shared-worker/${++sharedWorkerCounter}`;

	const sharedWorker = new Worker(LOADER, {
		// Ensure the sharedWorker crashes for unhandled rejections, rather than allowing undefined behavior.
		execArgv: ['--unhandled-rejections=strict'],
		workerData: {
			filename,
			id,
			initialData
		}
	});
	sharedWorker.setMaxListeners(0);

	const launched = {
		id,
		statePromises: {
			available: waitForAvailable(sharedWorker),
			error: events.once(sharedWorker, 'error').then(([error]) => error) // eslint-disable-line promise/prefer-await-to-then
		},
		exited: false,
		worker: sharedWorker
	};

	launchedWorkers.set(filename, launched);
	sharedWorker.once('exit', () => {
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
		const launched = await launchWorker(channel);

		const handleChannelMessage = ({messageId, replyTo, data}) => {
			launched.worker.postMessage({
				type: 'message',
				testWorkerId: fork.forkId,
				messageId,
				replyTo,
				data
			});
		};

		const handleWorkerMessage = async message => {
			if (message.type === 'deregistered-test-worker' && message.id === fork.forkId) {
				launched.worker.off('message', handleWorkerMessage);

				registrationCount--;
				if (registrationCount === 0) {
					signalDeregistered();
				}
			}
		};

		const {port1, port2} = new MessageChannel();
		launched.statePromises.error.then(error => { // eslint-disable-line promise/prefer-await-to-then
			signalDeregistered();
			launched.worker.off('message', handleWorkerMessage);
			runStatus.emitStateChange({type: 'shared-worker-error', err: serializeError('Shared worker error', true, error)});
			channel.signalError();
		});

		try {
			await launched.statePromises.available;

			registrationCount++;

			channel.worker.postMessage({
				ava: {
					type: 'shared-worker-port',
					id: launched.id,
					filename: channel.filename,
					port: port2
				}
			}, [port2]);

			launched.worker.postMessage({
				type: 'register-test-worker',
				id: fork.forkId,
				file: fork.file,
				port: port1
			}, [port1]);

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
