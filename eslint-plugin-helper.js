'use strict';
let isMainThread = true;
let supportsWorkers = false;
try {
	({isMainThread} = require('worker_threads'));
	supportsWorkers = true;
} catch {}

const {classify, hasExtension, isHelperish, matches, normalizeFileForMatching, normalizeGlobs, normalizePatterns} = require('./lib/globs');

let resolveGlobs;

if (!supportsWorkers || !isMainThread) {
	const normalizeExtensions = require('./lib/extensions');
	const {loadConfigSync} = require('./lib/load-config');
	const providerManager = require('./lib/provider-manager');

	const configCache = new Map();

	resolveGlobs = (projectDir, overrideExtensions, overrideFiles) => {
		let conf;
		let providers;
		if (configCache.has(projectDir)) {
			({conf, providers} = configCache.get(projectDir));
		} else {
			conf = loadConfigSync({resolveFrom: projectDir});

			providers = [];
			if (Reflect.has(conf, 'babel')) {
				const {level, main} = providerManager.babel(projectDir);
				providers.push({
					level,
					main: main({config: conf.babel}),
					type: 'babel'
				});
			}

			if (Reflect.has(conf, 'typescript')) {
				const {level, main} = providerManager.typescript(projectDir);
				providers.push({
					level,
					main: main({config: conf.typescript}),
					type: 'typescript'
				});
			}

			configCache.set(projectDir, {conf, providers});
		}

		const extensions = overrideExtensions ?
			normalizeExtensions(overrideExtensions) :
			normalizeExtensions(conf.extensions, providers);

		return {
			cwd: projectDir,
			...normalizeGlobs({
				extensions,
				files: overrideFiles ? overrideFiles : conf.files,
				providers
			})
		};
	};
}

if (supportsWorkers) {
	const v8 = require('v8');

	const MAX_DATA_LENGTH_EXCLUSIVE = 100 * 1024; // Allocate 100 KiB to exchange globs.

	if (isMainThread) {
		const {Worker} = require('worker_threads');
		let data;
		let sync;
		let worker;

		resolveGlobs = (projectDir, overrideExtensions, overrideFiles) => {
			if (worker === undefined) {
				const dataBuffer = new SharedArrayBuffer(MAX_DATA_LENGTH_EXCLUSIVE);
				data = new Uint8Array(dataBuffer);

				const syncBuffer = new SharedArrayBuffer(4);
				sync = new Int32Array(syncBuffer);

				worker = new Worker(__filename, {
					workerData: {
						dataBuffer,
						syncBuffer,
						firstMessage: {projectDir, overrideExtensions, overrideFiles}
					}
				});
				worker.unref();
			} else {
				worker.postMessage({projectDir, overrideExtensions, overrideFiles});
			}

			Atomics.wait(sync, 0, 0);

			const byteLength = Atomics.exchange(sync, 0, 0);
			if (byteLength === MAX_DATA_LENGTH_EXCLUSIVE) {
				throw new Error('Globs are over 100 KiB and cannot be resolved');
			}

			const globsOrError = v8.deserialize(data.slice(0, byteLength));
			if (globsOrError instanceof Error) {
				throw globsOrError;
			}

			return globsOrError;
		};
	} else {
		const {parentPort, workerData} = require('worker_threads');
		const data = new Uint8Array(workerData.dataBuffer);
		const sync = new Int32Array(workerData.syncBuffer);

		const handleMessage = ({projectDir, overrideExtensions, overrideFiles}) => {
			let encoded;
			try {
				const globs = resolveGlobs(projectDir, overrideExtensions, overrideFiles);
				encoded = v8.serialize(globs);
			} catch (error) {
				encoded = v8.serialize(error);
			}

			const byteLength = encoded.length < MAX_DATA_LENGTH_EXCLUSIVE ? encoded.copy(data) : MAX_DATA_LENGTH_EXCLUSIVE;
			Atomics.store(sync, 0, byteLength);
			Atomics.notify(sync, 0);
		};

		parentPort.on('message', handleMessage);
		handleMessage(workerData.firstMessage);
		delete workerData.firstMessage;
	}
}

const helperCache = new Map();

function load(projectDir, overrides) {
	const cacheKey = `${JSON.stringify(overrides)}\n${projectDir}`;
	if (helperCache.has(cacheKey)) {
		return helperCache.get(cacheKey);
	}

	let helperPatterns = [];
	if (overrides && overrides.helpers !== undefined) {
		if (!Array.isArray(overrides.helpers) || overrides.helpers.length === 0) {
			throw new Error('The ’helpers’ override must be an array containing glob patterns.');
		}

		helperPatterns = normalizePatterns(overrides.helpers);
	}

	const globs = resolveGlobs(projectDir, overrides && overrides.extensions, overrides && overrides.files);

	const classifyForESLint = file => {
		const {isTest} = classify(file, globs);
		let isHelper = false;
		if (!isTest && hasExtension(globs.extensions, file)) {
			file = normalizeFileForMatching(projectDir, file);
			isHelper = isHelperish(file) || (helperPatterns.length > 0 && matches(file, helperPatterns));
		}

		return {isHelper, isTest};
	};

	const helper = Object.freeze({
		classifyFile: classifyForESLint,
		classifyImport: importPath => {
			if (hasExtension(globs.extensions, importPath)) {
				// The importPath has one of the test file extensions: we can classify
				// it directly.
				return classifyForESLint(importPath);
			}

			// Add the first extension. If multiple extensions are available, assume
			// patterns are not biased to any particular extension.
			return classifyForESLint(`${importPath}.${globs.extensions[0]}`);
		}
	});
	helperCache.set(cacheKey, helper);
	return helper;
}

exports.load = load;
