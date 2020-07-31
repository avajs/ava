'use strict';
const {pathToFileURL} = require('url');
const currentlyUnhandled = require('currently-unhandled')();

require('./ensure-forked'); // eslint-disable-line import/no-unassigned-import

const ipc = require('./ipc');

const supportsESM = async () => {
	try {
		await import('data:text/javascript,'); // eslint-disable-line node/no-unsupported-features/es-syntax
		return true;
	} catch {}

	return false;
};

ipc.send({type: 'ready-for-options'});
ipc.options.then(async options => {
	require('./options').set(options);
	require('../chalk').set(options.chalkOptions);

	if (options.chalkOptions.level > 0) {
		const {stdout, stderr} = process;
		global.console = Object.assign(global.console, new console.Console({stdout, stderr, colorMode: true}));
	}

	const nowAndTimers = require('../now-and-timers');
	const providerManager = require('../provider-manager');
	const Runner = require('../runner');
	const serializeError = require('../serialize-error');
	const dependencyTracking = require('./dependency-tracker');
	const lineNumberSelection = require('./line-numbers');

	async function exit(code) {
		if (!process.exitCode) {
			process.exitCode = code;
		}

		dependencyTracking.flush();
		await ipc.flush();
		process.exit(); // eslint-disable-line unicorn/no-process-exit
	}

	// TODO: Initialize providers here, then pass to lineNumberSelection() so they
	// can be used to parse the test file.
	let checkSelectedByLineNumbers;
	try {
		checkSelectedByLineNumbers = lineNumberSelection({
			file: options.file,
			lineNumbers: options.lineNumbers
		});
	} catch (error) {
		ipc.send({type: 'line-number-selection-error', err: serializeError('Line number selection error', false, error, options.file)});
		checkSelectedByLineNumbers = () => false;
	}

	const runner = new Runner({
		checkSelectedByLineNumbers,
		experiments: options.experiments,
		failFast: options.failFast,
		failWithoutAssertions: options.failWithoutAssertions,
		file: options.file,
		match: options.match,
		projectDir: options.projectDir,
		recordNewSnapshots: options.recordNewSnapshots,
		runOnlyExclusive: options.runOnlyExclusive,
		serial: options.serial,
		snapshotDir: options.snapshotDir,
		updateSnapshots: options.updateSnapshots
	});

	ipc.peerFailed.then(() => { // eslint-disable-line promise/prefer-await-to-then
		runner.interrupt();
	});

	const attributedRejections = new Set();
	process.on('unhandledRejection', (reason, promise) => {
		if (runner.attributeLeakedError(reason)) {
			attributedRejections.add(promise);
		}
	});

	runner.on('dependency', dependencyTracking.track);
	runner.on('stateChange', state => ipc.send(state));

	runner.on('error', error => {
		ipc.send({type: 'internal-error', err: serializeError('Internal runner error', false, error, runner.file)});
		exit(1);
	});

	runner.on('finish', () => {
		try {
			const {cannotSave, touchedFiles} = runner.saveSnapshotState();
			if (cannotSave) {
				ipc.send({type: 'snapshot-error'});
			} else if (touchedFiles) {
				ipc.send({type: 'touched-files', files: touchedFiles});
			}
		} catch (error) {
			ipc.send({type: 'internal-error', err: serializeError('Internal runner error', false, error, runner.file)});
			exit(1);
			return;
		}

		nowAndTimers.setImmediate(() => {
			currentlyUnhandled()
				.filter(rejection => !attributedRejections.has(rejection.promise))
				.forEach(rejection => {
					ipc.send({type: 'unhandled-rejection', err: serializeError('Unhandled rejection', true, rejection.reason, runner.file)});
				});

			exit(0);
		});
	});

	process.on('uncaughtException', error => {
		if (runner.attributeLeakedError(error)) {
			return;
		}

		ipc.send({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error, runner.file)});
		exit(1);
	});

	let accessedRunner = false;
	exports.getRunner = () => {
		accessedRunner = true;
		return runner;
	};

	// Store value to prevent required modules from modifying it.
	const testPath = options.file;

	// Install basic source map support.
	const sourceMapSupport = require('source-map-support');
	sourceMapSupport.install({
		environment: 'node',
		handleUncaughtExceptions: false
	});

	const extensionsToLoadAsModules = Object.entries(options.moduleTypes)
		.filter(([, type]) => type === 'module')
		.map(([extension]) => extension);

	// Install before processing options.require, so if helpers are added to the
	// require configuration the *compiled* helper will be loaded.
	const {projectDir, providerStates = []} = options;
	const providers = providerStates.map(({type, state}) => {
		if (type === 'babel') {
			const provider = providerManager.babel(projectDir).worker({extensionsToLoadAsModules, state});
			runner.powerAssert = provider.powerAssert;
			return provider;
		}

		if (type === 'typescript') {
			return providerManager.typescript(projectDir).worker({extensionsToLoadAsModules, state});
		}

		return null;
	}).filter(provider => provider !== null);

	let requireFn = require;
	let isESMSupported;
	const load = async ref => {
		for (const extension of extensionsToLoadAsModules) {
			if (ref.endsWith(`.${extension}`)) {
				if (typeof isESMSupported !== 'boolean') {
					// Lazily determine support since this prints an experimental warning.
					// eslint-disable-next-line no-await-in-loop
					isESMSupported = await supportsESM();
				}

				if (isESMSupported) {
					return import(pathToFileURL(ref)); // eslint-disable-line node/no-unsupported-features/es-syntax
				}

				ipc.send({type: 'internal-error', err: serializeError('Internal runner error', false, new Error('ECMAScript Modules are not supported in this Node.js version.'))});
				exit(1);
				return;
			}
		}

		for (const provider of providers) {
			if (provider.canLoad(ref)) {
				return provider.load(ref, {requireFn});
			}
		}

		return requireFn(ref);
	};

	try {
		for await (const ref of (options.require || [])) {
			const mod = await load(ref);

			try {
				if (Reflect.has(mod, Symbol.for('esm:package'))) {
					requireFn = mod(module);
				}
			} catch {}
		}

		// Install dependency tracker after the require configuration has been evaluated
		// to make sure we also track dependencies with custom require hooks
		dependencyTracking.install(testPath);

		if (options.debug && options.debug.port !== undefined && options.debug.host !== undefined) {
			// If an inspector was active when the main process started, and is
			// already active for the worker process, do not open a new one.
			const inspector = require('inspector'); // eslint-disable-line node/no-unsupported-features/node-builtins
			if (!options.debug.active || inspector.url() === undefined) {
				inspector.open(options.debug.port, options.debug.host, true);
			}

			if (options.debug.break) {
				debugger; // eslint-disable-line no-debugger
			}
		}

		await load(testPath);

		if (accessedRunner) {
			// Unreference the IPC channel if the test file required AVA. This stops it
			// from keeping the event loop busy, which means the `beforeExit` event can be
			// used to detect when tests stall.
			ipc.unref();
		} else {
			ipc.send({type: 'missing-ava-import'});
			exit(1);
		}
	} catch (error) {
		ipc.send({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error, runner.file)});
		exit(1);
	}
}).catch(error => {
	// There shouldn't be any errors, but if there are we may not have managed
	// to bootstrap enough code to serialize them. Re-throw and let the process
	// crash.
	setImmediate(() => {
		throw error;
	});
});
