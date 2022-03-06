import v8 from 'node:v8';
import {parentPort, workerData} from 'node:worker_threads';

import normalizeExtensions from './extensions.js';
import {normalizeGlobs} from './globs.js';
import {loadConfig} from './load-config.js';
import providerManager from './provider-manager.js';

const MAX_DATA_LENGTH_EXCLUSIVE = 100 * 1024; // Allocate 100 KiB to exchange globs.

const configCache = new Map();

const collectProviders = async ({conf, projectDir}) => {
	const providers = [];
	if (Reflect.has(conf, 'typescript')) {
		const {level, main} = await providerManager.typescript(projectDir);
		providers.push({
			level,
			main: main({config: conf.typescript}),
			type: 'typescript',
		});
	}

	return providers;
};

const buildGlobs = ({conf, providers, projectDir, overrideExtensions, overrideFiles}) => {
	const extensions = overrideExtensions
		? normalizeExtensions(overrideExtensions)
		: normalizeExtensions(conf.extensions, providers);

	return {
		cwd: projectDir,
		...normalizeGlobs({
			extensions,
			files: overrideFiles ? overrideFiles : conf.files,
			providers,
		}),
	};
};

const resolveGlobs = async (projectDir, overrideExtensions, overrideFiles) => {
	if (!configCache.has(projectDir)) {
		configCache.set(projectDir, loadConfig({resolveFrom: projectDir}).then(async ({config: conf}) => {
			const providers = await collectProviders({conf, projectDir});
			return {conf, providers};
		}));
	}

	const {conf, providers} = await configCache.get(projectDir);
	return buildGlobs({conf, providers, projectDir, overrideExtensions, overrideFiles});
};

const data = new Uint8Array(workerData.dataBuffer);
const sync = new Int32Array(workerData.syncBuffer);

const handleMessage = async ({projectDir, overrideExtensions, overrideFiles}) => {
	let encoded;
	try {
		const globs = await resolveGlobs(projectDir, overrideExtensions, overrideFiles);
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
