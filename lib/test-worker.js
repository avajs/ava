'use strict';
const EventEmitter = require('events');
const domain = require('domain'); // eslint-disable-line no-restricted-modules
const resolveFrom = require('resolve-from');
const decache = require('decache');
const isObj = require('is-obj');
const currentlyUnhandled = require('currently-unhandled')();
const serializeError = require('./serialize-error');
const adapter = require('./process-adapter');

// Shared values between tests must be in `global` and not in a shared module,
// because in single mode test worker must decache `ava` for every file,
// which clears all children modules as well, so shared module would lose its values.
global.__shared = {
	options: {},
	runner: {},
	ipcMain: {},
	ipcWorker: {}
};

module.exports = ({ipcMain, opts, isForked}) => {
	if (isForked) {
		adapter.setupFakeTTY(opts);
	}

	adapter.setupTimeRequire(opts);

	const ipcWorker = new EventEmitter();

	// Parse and re-emit AVA messages
	ipcMain.on('message', message => {
		if (!message.ava) {
			return;
		}

		ipcWorker.emit(message.name, message.data);
	});

	(opts.require || []).forEach(x => {
		if (/[/\\]@std[/\\]esm[/\\]index\.js$/.test(x)) {
			require = require(x)(module); // eslint-disable-line no-global-assign
		} else {
			require(x);
		}
	});

	adapter.installSourceMapSupport();
	adapter.installPrecompilerHook(opts);

	const testPath = opts.file;

	const dependencies = new Set();
	adapter.installDependencyTracking(dependencies, testPath);

	const touchedFiles = new Set();

	global.__shared.ipcMain[testPath] = ipcMain;
	global.__shared.ipcWorker[testPath] = ipcWorker;
	global.__shared.options = opts;

	const handleUncaughtException = exception => {
		if (attributeLeakedError(exception)) {
			return;
		}

		let serialized;
		try {
			serialized = serializeError(exception);
		} catch (ignore) { // eslint-disable-line unicorn/catch-error-name
			// Avoid using serializeError
			const err = new Error('Failed to serialize uncaught exception');
			serialized = {
				avaAssertionError: false,
				name: err.name,
				message: err.message,
				stack: err.stack
			};
		}

		// Ensure the IPC channel is refereced. The uncaught exception will kick off
		// the teardown sequence, for which the messages must be received.
		ipcMain.ipcChannel.ref();

		ipcMain.send('uncaughtException', {exception: serialized});
	};

	if (isForked) {
		require(testPath);
	} else {
		// AVA's entrypoint (lib/main) must have access to test path via module.parent.filename.
		// If we don't decache lib/main, test path will remain the same for all tests.
		decache(resolveFrom(testPath, 'ava'));

		// Running tests in single mode causes uncaught exception to be handled by AVA process itself.
		// We're using domains to bound these exceptions to specific test files.
		const d = domain.create();
		d.on('error', handleUncaughtException);
		d.run(() => {
			require(testPath);
		});
	}

	const runner = global.__shared.runner[testPath];

	// If AVA was not required, show an error
	if (!runner) {
		ipcMain.send('no-tests', {avaRequired: false});
	}

	runner.on('dependency', file => {
		dependencies.add(file);
	});

	runner.on('touched', files => {
		for (const file of files) {
			touchedFiles.add(file);
		}
	});

	function attributeLeakedError(err) {
		if (!runner) {
			return false;
		}

		return runner.attributeLeakedError(err);
	}

	const attributedRejections = new Set();
	process.on('unhandledRejection', (reason, promise) => {
		if (attributeLeakedError(reason)) {
			attributedRejections.add(promise);
		}
	});

	process.on('uncaughtException', handleUncaughtException);

	let tearingDown = false;
	ipcWorker.on('ava-teardown', () => {
		// AVA-teardown can be sent more than once
		if (tearingDown) {
			return;
		}
		tearingDown = true;

		let rejections = currentlyUnhandled()
			.filter(rejection => !attributedRejections.has(rejection.promise));

		if (rejections.length > 0) {
			// Emit `rejectionHandled` for each recorded rejection to prevent
			// `loud-rejection` module from logging all of them before process exits,
			// which would happen in the single mode.
			rejections.forEach(rejection => {
				process.emit('rejectionHandled', rejection.promise);
			});

			rejections = rejections.map(rejection => {
				let reason = rejection.reason;
				if (!isObj(reason) || typeof reason.message !== 'string') {
					reason = {
						message: String(reason)
					};
				}
				return serializeError(reason);
			});

			ipcMain.send('unhandledRejections', {rejections});
		}

		// Include dependencies in the final teardown message. This ensures the full
		// set of dependencies is included no matter how the process exits, unless
		// it flat out crashes. Also include any files that AVA touched during the
		// test run. This allows the watcher to ignore modifications to those files.
		ipcMain.send('teardown', {
			dependencies: Array.from(dependencies),
			touchedFiles: Array.from(touchedFiles)
		});
	});

	ipcWorker.on('ava-exit', () => {
		if (isForked) {
			process.exit(0); // eslint-disable-line unicorn/no-process-exit
		} else {
			ipcMain.exit(0);
		}
	});
};
