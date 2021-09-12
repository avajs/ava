import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';

import {isPlainObject} from 'is-plain-object';
import pkgConf from 'pkg-conf';

const NO_SUCH_FILE = Symbol('no ava.config.js file');
const MISSING_DEFAULT_EXPORT = Symbol('missing default export');
const EXPERIMENTS = new Set([
	'sharedWorkers',
]);

const importConfig = async ({configFile, fileForErrorMessage}) => {
	const {default: config = MISSING_DEFAULT_EXPORT} = await import(url.pathToFileURL(configFile)); // eslint-disable-line node/no-unsupported-features/es-syntax
	if (config === MISSING_DEFAULT_EXPORT) {
		throw new Error(`${fileForErrorMessage} must have a default export`);
	}

	return config;
};

const loadJsConfig = async ({projectDir, configFile = path.join(projectDir, 'ava.config.js')}) => {
	if (!configFile.endsWith('.js') || !fs.existsSync(configFile)) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);
	try {
		return {config: await importConfig({configFile, fileForErrorMessage}), fileForErrorMessage};
	} catch (error) {
		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}: ${error.message}`), {parent: error});
	}
};

const loadCjsConfig = async ({projectDir, configFile = path.join(projectDir, 'ava.config.cjs')}) => {
	if (!configFile.endsWith('.cjs') || !fs.existsSync(configFile)) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);
	try {
		const require = createRequire(import.meta.url);
		return {config: await require(configFile), fileForErrorMessage};
	} catch (error) {
		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}`), {parent: error});
	}
};

const loadMjsConfig = async ({projectDir, configFile = path.join(projectDir, 'ava.config.mjs')}) => {
	if (!configFile.endsWith('.mjs') || !fs.existsSync(configFile)) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);
	try {
		return {config: await importConfig({configFile, fileForErrorMessage}), fileForErrorMessage};
	} catch (error) {
		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}`), {parent: error});
	}
};

function resolveConfigFile(projectDir, configFile) {
	if (configFile) {
		configFile = path.resolve(configFile); // Relative to CWD
		if (path.basename(configFile) !== path.relative(projectDir, configFile)) {
			throw new Error('Config files must be located next to the package.json file');
		}

		if (!configFile.endsWith('.js') && !configFile.endsWith('.cjs') && !configFile.endsWith('.mjs')) {
			throw new Error('Config files must have .js, .cjs or .mjs extensions');
		}
	}

	return configFile;
}

export async function loadConfig({configFile, resolveFrom = process.cwd(), defaults = {}} = {}) {
	let packageConf = await pkgConf('ava', {cwd: resolveFrom});
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? resolveFrom : path.dirname(filepath);

	configFile = resolveConfigFile(projectDir, configFile);
	const allowConflictWithPackageJson = Boolean(configFile);

	// TODO: Refactor resolution logic to implement https://github.com/avajs/ava/issues/2285.
	let [{config: fileConf, fileForErrorMessage} = {config: NO_SUCH_FILE, fileForErrorMessage: undefined}, ...conflicting] = (await Promise.all([
		loadJsConfig({projectDir, configFile}, true),
		loadCjsConfig({projectDir, configFile}),
		loadMjsConfig({projectDir, configFile}, true),
	])).filter(result => result !== null);

	if (conflicting.length > 0) {
		throw new Error(`Conflicting configuration in ${fileForErrorMessage} and ${conflicting.map(({fileForErrorMessage}) => fileForErrorMessage).join(' & ')}`);
	}

	if (fileConf !== NO_SUCH_FILE) {
		if (allowConflictWithPackageJson) {
			packageConf = {};
		} else if (Object.keys(packageConf).length > 0) {
			throw new Error(`Conflicting configuration in ${fileForErrorMessage} and package.json`);
		}

		if (!isPlainObject(fileConf) && typeof fileConf !== 'function') {
			throw new TypeError(`${fileForErrorMessage} must export a plain object or factory function`);
		}

		if (typeof fileConf === 'function') {
			fileConf = await fileConf({projectDir});

			if (!isPlainObject(fileConf)) {
				throw new TypeError(`Factory method exported by ${fileForErrorMessage} must return a plain object`);
			}
		}

		if ('ava' in fileConf) {
			throw new Error(`Encountered ’ava’ property in ${fileForErrorMessage}; avoid wrapping the configuration`);
		}
	}

	const config = {...defaults, nonSemVerExperiments: {}, ...fileConf, ...packageConf, projectDir};

	const {nonSemVerExperiments: experiments} = config;
	if (!isPlainObject(experiments)) {
		throw new Error(`nonSemVerExperiments from ${fileForErrorMessage} must be an object`);
	}

	for (const key of Object.keys(experiments)) {
		if (!EXPERIMENTS.has(key)) {
			throw new Error(`nonSemVerExperiments.${key} from ${fileForErrorMessage} is not a supported experiment`);
		}
	}

	return config;
}
