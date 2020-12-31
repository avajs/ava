'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');
const vm = require('vm');
const {isPlainObject} = require('is-plain-object');
const pkgConf = require('pkg-conf');

const NO_SUCH_FILE = Symbol('no ava.config.js file');
const MISSING_DEFAULT_EXPORT = Symbol('missing default export');
const EXPERIMENTS = new Set([
	'configurableModuleFormat',
	'disableNullExpectations',
	'disableSnapshotsInHooks',
	'nextGenConfig',
	'reverseTeardowns',
	'sharedWorkers'
]);

// *Very* rudimentary support for loading ava.config.js files containing an `export default` statement.
const evaluateJsConfig = (contents, configFile) => {
	const script = new vm.Script(`'use strict';(()=>{let __export__;\n${contents.toString('utf8').replace(/export default/g, '__export__ =')};return __export__;})()`, {
		filename: configFile,
		lineOffset: -1
	});
	return script.runInThisContext();
};

const importConfig = async ({configFile, fileForErrorMessage}) => {
	let module;
	try {
		module = await import(url.pathToFileURL(configFile)); // eslint-disable-line node/no-unsupported-features/es-syntax
	} catch (error) {
		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}: ${error.message}`), {parent: error});
	}

	const {default: config = MISSING_DEFAULT_EXPORT} = module;
	if (config === MISSING_DEFAULT_EXPORT) {
		throw new Error(`${fileForErrorMessage} must have a default export`);
	}

	return config;
};

const loadJsConfig = ({projectDir, configFile = path.join(projectDir, 'ava.config.js')}, useImport = false) => {
	if (!configFile.endsWith('.js')) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);

	let config;
	try {
		const contents = fs.readFileSync(configFile);
		config = useImport && contents.includes('nonSemVerExperiments') && contents.includes('nextGenConfig') ?
			importConfig({configFile, fileForErrorMessage}) :
			evaluateJsConfig(contents, configFile) || MISSING_DEFAULT_EXPORT;
	} catch (error) {
		if (error.code === 'ENOENT') {
			return null;
		}

		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}: ${error.message}`), {parent: error});
	}

	if (config === MISSING_DEFAULT_EXPORT) {
		throw new Error(`${fileForErrorMessage} must have a default export, using ES module syntax`);
	}

	return {config, fileForErrorMessage};
};

const loadCjsConfig = ({projectDir, configFile = path.join(projectDir, 'ava.config.cjs')}) => {
	if (!configFile.endsWith('.cjs')) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);
	try {
		return {config: require(configFile), fileForErrorMessage};
	} catch (error) {
		if (error.code === 'MODULE_NOT_FOUND') {
			return null;
		}

		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}`), {parent: error});
	}
};

const loadMjsConfig = ({projectDir, configFile = path.join(projectDir, 'ava.config.mjs')}, experimentally = false) => {
	if (!configFile.endsWith('.mjs')) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);
	try {
		const contents = fs.readFileSync(configFile);
		if (experimentally && contents.includes('nonSemVerExperiments') && contents.includes('nextGenConfig')) {
			return {config: importConfig({configFile, fileForErrorMessage}), fileForErrorMessage};
		}
	} catch (error) {
		if (error.code === 'ENOENT') {
			return null;
		}

		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}`), {parent: error});
	}

	throw new Error(`AVA cannot yet load ${fileForErrorMessage} files`);
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

function loadConfigSync({configFile, resolveFrom = process.cwd(), defaults = {}} = {}) {
	let packageConf = pkgConf.sync('ava', {cwd: resolveFrom});
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? resolveFrom : path.dirname(filepath);

	configFile = resolveConfigFile(projectDir, configFile);
	const allowConflictWithPackageJson = Boolean(configFile);

	let [{config: fileConf, fileForErrorMessage} = {config: NO_SUCH_FILE, fileForErrorMessage: undefined}, ...conflicting] = [
		loadJsConfig({projectDir, configFile}),
		loadCjsConfig({projectDir, configFile}),
		loadMjsConfig({projectDir, configFile})
	].filter(result => result !== null);

	if (conflicting.length > 0) {
		throw new Error(`Conflicting configuration in ${fileForErrorMessage} and ${conflicting.map(({fileForErrorMessage}) => fileForErrorMessage).join(' & ')}`);
	}

	if (fileConf !== NO_SUCH_FILE) {
		if (allowConflictWithPackageJson) {
			packageConf = {};
		} else if (Object.keys(packageConf).length > 0) {
			throw new Error(`Conflicting configuration in ${fileForErrorMessage} and package.json`);
		}

		if (fileConf && typeof fileConf.then === 'function') { // eslint-disable-line promise/prefer-await-to-then
			throw new TypeError(`${fileForErrorMessage} must not export a promise`);
		}

		if (!isPlainObject(fileConf) && typeof fileConf !== 'function') {
			throw new TypeError(`${fileForErrorMessage} must export a plain object or factory function`);
		}

		if (typeof fileConf === 'function') {
			fileConf = fileConf({projectDir});
			if (fileConf && typeof fileConf.then === 'function') { // eslint-disable-line promise/prefer-await-to-then
				throw new TypeError(`Factory method exported by ${fileForErrorMessage} must not return a promise`);
			}

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

exports.loadConfigSync = loadConfigSync;

async function loadConfig({configFile, resolveFrom = process.cwd(), defaults = {}} = {}) {
	let packageConf = await pkgConf('ava', {cwd: resolveFrom});
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? resolveFrom : path.dirname(filepath);

	configFile = resolveConfigFile(projectDir, configFile);
	const allowConflictWithPackageJson = Boolean(configFile);

	// TODO: Refactor resolution logic to implement https://github.com/avajs/ava/issues/2285.
	let [{config: fileConf, fileForErrorMessage} = {config: NO_SUCH_FILE, fileForErrorMessage: undefined}, ...conflicting] = [
		loadJsConfig({projectDir, configFile}, true),
		loadCjsConfig({projectDir, configFile}),
		loadMjsConfig({projectDir, configFile}, true)
	].filter(result => result !== null);

	if (conflicting.length > 0) {
		throw new Error(`Conflicting configuration in ${fileForErrorMessage} and ${conflicting.map(({fileForErrorMessage}) => fileForErrorMessage).join(' & ')}`);
	}

	let sawPromise = false;
	if (fileConf !== NO_SUCH_FILE) {
		if (allowConflictWithPackageJson) {
			packageConf = {};
		} else if (Object.keys(packageConf).length > 0) {
			throw new Error(`Conflicting configuration in ${fileForErrorMessage} and package.json`);
		}

		if (fileConf && typeof fileConf.then === 'function') { // eslint-disable-line promise/prefer-await-to-then
			sawPromise = true;
			fileConf = await fileConf;
		}

		if (!isPlainObject(fileConf) && typeof fileConf !== 'function') {
			throw new TypeError(`${fileForErrorMessage} must export a plain object or factory function`);
		}

		if (typeof fileConf === 'function') {
			fileConf = fileConf({projectDir});
			if (fileConf && typeof fileConf.then === 'function') { // eslint-disable-line promise/prefer-await-to-then
				sawPromise = true;
				fileConf = await fileConf;
			}

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

	if (sawPromise && experiments.nextGenConfig !== true) {
		throw new Error(`${fileForErrorMessage} exported a promise or an asynchronous factory function. You must enable the ’asyncConfigurationLoading’ experiment for this to work.`);
	}

	return config;
}

exports.loadConfig = loadConfig;
