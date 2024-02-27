import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join as joinPath, resolve as resolvePath} from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {workerData} from 'node:worker_threads';

import setUpCurrentlyUnhandled from 'currently-unhandled';
import writeFileAtomic from 'write-file-atomic';

import {set as setChalk} from '../chalk.js';
import nowAndTimers from '../now-and-timers.cjs';
import providerManager from '../provider-manager.js';
import Runner from '../runner.js';
import serializeError from '../serialize-error.js';

import channel from './channel.cjs';
import {runCompletionHandlers} from './completion-handlers.js';
import lineNumberSelection from './line-numbers.js';
import {set as setOptions} from './options.cjs';
import {flags, refs, sharedWorkerTeardowns} from './state.cjs';
import {isRunningInThread, isRunningInChildProcess} from './utils.cjs';

const currentlyUnhandled = setUpCurrentlyUnhandled();
let runner;

let expectingExit = false;

const forceExit = () => {
	expectingExit = true;
	process.exit(1);
};

const avaIsDone = () => {
	expectingExit = true;
	runCompletionHandlers();
};

// Override process.exit with an undetectable replacement
// to report when it is called from a test (which it should never be).
const handleProcessExit = (target, thisArg, args) => {
	if (!expectingExit) {
		const error = new Error('Unexpected process.exit()');
		Error.captureStackTrace(error, handleProcessExit);
		channel.send({type: 'process-exit', stack: error.stack});
	}

	target.apply(thisArg, args);
};

process.exit = new Proxy(process.exit, {
	apply: handleProcessExit,
});

const run = async options => {
	setOptions(options);
	setChalk(options.chalkOptions);

	if (options.chalkOptions.level > 0) {
		const {stdout, stderr} = process;
		global.console = Object.assign(global.console, new console.Console({stdout, stderr, colorMode: true}));
	}

	let checkSelectedByLineNumbers;
	try {
		checkSelectedByLineNumbers = lineNumberSelection({
			file: options.file,
			lineNumbers: options.lineNumbers,
		});
	} catch (error) {
		channel.send({type: 'line-number-selection-error', err: serializeError(error)});
		checkSelectedByLineNumbers = () => false;
	}

	runner = new Runner({
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
		updateSnapshots: options.updateSnapshots,
	});

	refs.runnerChain = runner.chain;

	channel.peerFailed.then(() => {
		runner.interrupt();
	});

	runner.on('accessed-snapshots', filename => channel.send({type: 'accessed-snapshots', filename}));
	runner.on('stateChange', state => channel.send(state));

	runner.on('error', error => {
		channel.send({type: 'internal-error', err: serializeError(error)});
		forceExit();
	});

	runner.on('finish', async () => {
		try {
			const {touchedFiles} = await runner.saveSnapshotState();
			if (touchedFiles) {
				channel.send({type: 'touched-files', files: touchedFiles});
			}
		} catch (error) {
			channel.send({type: 'internal-error', err: serializeError(error)});
			forceExit();
			return;
		}

		try {
			await Promise.all(sharedWorkerTeardowns.map(fn => fn()));
		} catch (error) {
			channel.send({type: 'uncaught-exception', err: serializeError(error)});
			forceExit();
			return;
		}

		nowAndTimers.setImmediate(() => {
			const unhandled = currentlyUnhandled();
			if (unhandled.length === 0) {
				return avaIsDone();
			}

			for (const rejection of unhandled) {
				channel.send({type: 'unhandled-rejection', err: serializeError(rejection.reason, {testFile: options.file})});
			}

			forceExit();
		});
	});

	process.on('uncaughtException', error => {
		channel.send({type: 'uncaught-exception', err: serializeError(error, {testFile: options.file})});
		forceExit();
	});

	// Store value to prevent required modules from modifying it.
	const testPath = options.file;

	const extensionsToLoadAsModules = Object.entries(options.moduleTypes)
		.filter(([, type]) => type === 'module')
		.map(([extension]) => extension);

	// Install before processing options.require, so if helpers are added to the
	// require configuration the *compiled* helper will be loaded.
	const {projectDir, providerStates = []} = options;
	const providers = [];
	await Promise.all(providerStates.map(async ({type, state, protocol}) => {
		if (type === 'typescript') {
			const provider = await providerManager.typescript(projectDir, {protocol});
			providers.push(provider.worker({extensionsToLoadAsModules, state}));
		}
	}));

	const require = createRequire(import.meta.url);
	const load = async ref => {
		for (const provider of providers) {
			if (provider.canLoad(ref)) {
				return provider.load(ref, {requireFn: require});
			}
		}

		for (const extension of extensionsToLoadAsModules) {
			if (ref.endsWith(`.${extension}`)) {
				return import(pathToFileURL(ref));
			}
		}

		// We still support require() since it's more easily monkey-patched.
		return require(ref);
	};

	const loadRequiredModule = async ref => {
		// If the provider can load the module, assume it's a local file and not a
		// dependency.
		for (const provider of providers) {
			if (provider.canLoad(ref)) {
				return provider.load(ref, {requireFn: require});
			}
		}

		// Try to load the module as a file, relative to the project directory.
		// Match load() behavior.
		const fullPath = resolvePath(projectDir, ref);
		try {
			for (const extension of extensionsToLoadAsModules) {
				if (fullPath.endsWith(`.${extension}`)) {
					return await import(pathToFileURL(fullPath)); // eslint-disable-line no-await-in-loop
				}
			}

			return require(fullPath);
		} catch (error) {
			// If the module could not be found, assume it's not a file but a dependency.
			if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
				return importFromProject(ref);
			}

			throw error;
		}
	};

	let importFromProject = async ref => {
		// Do not use the cacheDir since it's not guaranteed to be inside node_modules.
		const avaCacheDir = joinPath(projectDir, 'node_modules', '.cache', 'ava');
		await mkdir(avaCacheDir, {recursive: true});
		const stubPath = joinPath(avaCacheDir, 'import-from-project.mjs');
		await writeFileAtomic(stubPath, 'export const importFromProject = ref => import(ref);\n');
		({importFromProject} = await import(pathToFileURL(stubPath)));
		return importFromProject(ref);
	};

	try {
		for await (const [ref, ...args] of (options.require ?? [])) {
			const loadedModule = await loadRequiredModule(ref);

			if (typeof loadedModule === 'function') { // CJS module
				await loadedModule(...args);
			} else if (typeof loadedModule.default === 'function') { // ES module, or exports.default from CJS
				const {default: fn} = loadedModule;
				await fn(...args);
			}
		}

		if (options.debug?.port !== undefined && options.debug?.host !== undefined) {
			// If an inspector was active when the main process started, and is
			// already active for the worker process, do not open a new one.
			const {default: inspector} = await import('node:inspector');
			if (!options.debug.active || inspector.url() === undefined) {
				inspector.open(options.debug.port, options.debug.host, true);
			}

			if (options.debug.break) {
				debugger; // eslint-disable-line no-debugger
			}
		}

		await load(testPath);

		if (flags.loadedMain) {
			// Unreference the channel if the test file required AVA. This stops it
			// from keeping the event loop busy, which means the `beforeExit` event can be
			// used to detect when tests stall.
			channel.unref();
		} else {
			channel.send({type: 'missing-ava-import'});
			forceExit();
		}
	} catch (error) {
		channel.send({type: 'uncaught-exception', err: serializeError(error, {testFile: options.file})});
		forceExit();
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

let options;
if (isRunningInThread) {
	channel.send({type: 'starting'}); // AVA won't terminate the worker thread until it's seen this message.
	({options} = workerData);
	delete workerData.options; // Don't allow user code access.
} else if (isRunningInChildProcess) {
	channel.send({type: 'ready-for-options'});
	options = await channel.options;
}

try {
	await run(options);
} catch (error) {
	onError(error);
}
