'use strict';
const path = require('node:path');
const url = require('node:url');
const v8 = require('node:v8');
const {Worker} = require('node:worker_threads');

const {
	classify,
	hasExtension,
	isHelperish,
	matches,
	normalizeFileForMatching,
	normalizePatterns,
} = require('../lib/glob-helpers.cjs');

const MAX_DATA_LENGTH_EXCLUSIVE = 100 * 1024; // Allocate 100 KiB to exchange globs.

let data;
let sync;
let worker;

const resolveGlobsSync = (projectDir, overrideExtensions, overrideFiles) => {
	if (worker === undefined) {
		const dataBuffer = new SharedArrayBuffer(MAX_DATA_LENGTH_EXCLUSIVE);
		data = new Uint8Array(dataBuffer);

		const syncBuffer = new SharedArrayBuffer(4);
		sync = new Int32Array(syncBuffer);

		const filename = path.join(__dirname, '../lib/eslint-plugin-helper-worker.js');
		worker = new Worker(url.pathToFileURL(filename), {
			workerData: {
				dataBuffer,
				syncBuffer,
				firstMessage: {projectDir, overrideExtensions, overrideFiles},
			},
		});
		worker.unref();
	} else {
		worker.postMessage({projectDir, overrideExtensions, overrideFiles});
	}

	const synchronize = Atomics.wait(sync, 0, 0, 10_000);
	if (synchronize === 'timed-out') {
		throw new Error('Timed out resolving AVA configuration');
	}

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

	const globs = resolveGlobsSync(projectDir, overrides && overrides.extensions, overrides && overrides.files);

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
		classifyImport(importPath) {
			if (hasExtension(globs.extensions, importPath)) {
				// The importPath has one of the test file extensions: we can classify
				// it directly.
				return classifyForESLint(importPath);
			}

			// Add the first extension. If multiple extensions are available, assume
			// patterns are not biased to any particular extension.
			return classifyForESLint(`${importPath}.${globs.extensions[0]}`);
		},
	});
	helperCache.set(cacheKey, helper);
	return helper;
}

exports.load = load;
