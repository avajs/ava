'use strict';
const {pathToFileURL} = require('url');
const path = require('path');
const currentlyUnhandled = require('currently-unhandled')();
const {isRunningInThread, isRunningInChildProcess} = require('./utils');

// Check if the test is being run without AVA cli
if (!isRunningInChildProcess && !isRunningInThread) {
	const chalk = require('chalk'); // Use default Chalk instance.
	if (process.argv[1]) {
		const fp = path.relative('.', process.argv[1]);

		console.log();
		console.error(`Test files must be run with the AVA CLI:\n\n    ${chalk.grey.dim('$')} ${chalk.cyan('ava ' + fp)}\n`);

		process.exit(1);
	} else {
		throw new Error('The ’ava’ module can only be imported in test files');
	}
}

const channel = require('./channel');

const run = async options => {
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

	const sharedWorkerTeardowns = [];

	async function exit(code) {
		if (!process.exitCode) {
			process.exitCode = code;
		}

		dependencyTracking.flush();
		await channel.flush();
		process.exit();
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
		channel.send({type: 'line-number-selection-error', err: serializeError('Line number selection error', false, error, options.file)});
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

	channel.peerFailed.then(() => { // eslint-disable-line promise/prefer-await-to-then
		runner.interrupt();
	});

	const attributedRejections = new Set();
	process.on('unhandledRejection', (reason, promise) => {
		if (runner.attributeLeakedError(reason)) {
			attributedRejections.add(promise);
		}
	});

	runner.on('dependency', dependencyTracking.track);
	runner.on('stateChange', state => channel.send(state));

	runner.on('error', error => {
		channel.send({type: 'internal-error', err: serializeError('Internal runner error', false, error, runner.file)});
		exit(1);
	});

	runner.on('finish', async () => {
		try {
			const {touchedFiles} = runner.saveSnapshotState();
			if (touchedFiles) {
				channel.send({type: 'touched-files', files: touchedFiles});
			}
		} catch (error) {
			channel.send({type: 'internal-error', err: serializeError('Internal runner error', false, error, runner.file)});
			exit(1);
			return;
		}

		try {
			await Promise.all(sharedWorkerTeardowns.map(fn => fn()));
		} catch (error) {
			channel.send({type: 'uncaught-exception', err: serializeError('Shared worker teardown error', false, error, runner.file)});
			exit(1);
			return;
		}

		nowAndTimers.setImmediate(() => {
			currentlyUnhandled()
				.filter(rejection => !attributedRejections.has(rejection.promise))
				.forEach(rejection => {
					channel.send({type: 'unhandled-rejection', err: serializeError('Unhandled rejection', true, rejection.reason, runner.file)});
				});

			exit(0);
		});
	});

	process.on('uncaughtException', error => {
		if (runner.attributeLeakedError(error)) {
			return;
		}

		channel.send({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error, runner.file)});
		exit(1);
	});

	let accessedRunner = false;
	exports.getRunner = () => {
		accessedRunner = true;
		return runner;
	};

	exports.registerSharedWorker = (filename, initialData, teardown) => {
		const {channel: sharedWorkerChannel, forceUnref, ready} = channel.registerSharedWorker(filename, initialData);
		runner.waitForReady.push(ready);
		sharedWorkerTeardowns.push(async () => {
			try {
				await teardown();
			} finally {
				forceUnref();
			}
		});
		return sharedWorkerChannel;
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

	const load = async ref => {
		for (const extension of extensionsToLoadAsModules) {
			if (ref.endsWith(`.${extension}`)) {
				return import(pathToFileURL(ref)); // eslint-disable-line node/no-unsupported-features/es-syntax
			}
		}

		for (const provider of providers) {
			if (provider.canLoad(ref)) {
				return provider.load(ref, {requireFn: require});
			}
		}

		return require(ref);
	};

	try {
		for await (const ref of (options.require || [])) {
			await load(ref);
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
			// Unreference the channel if the test file required AVA. This stops it
			// from keeping the event loop busy, which means the `beforeExit` event can be
			// used to detect when tests stall.
			channel.unref();
		} else {
			channel.send({type: 'missing-ava-import'});
			exit(1);
		}
	} catch (error) {
		channel.send({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error, runner.file)});
		exit(1);
	}
};

const onError = error => {
	// There shouldn't be any errors, but if there are we may not have managed
	// to bootstrap enough code to serialize them. Re-throw and let the process
	// crash.
	setImmediate(() => {
		throw error;
	});
};

if (isRunningInThread) {
	const {workerData} = require('worker_threads');
	const {options} = workerData;
	delete workerData.options; // Don't allow user code access.
	run(options).catch(onError);
} else if (isRunningInChildProcess) {
	channel.send({type: 'ready-for-options'});
	channel.options.then(run).catch(onError); // eslint-disable-line promise/prefer-await-to-then
}
