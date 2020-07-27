'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const isPlainObject = require('is-plain-object');
const pkgConf = require('pkg-conf');

const NO_SUCH_FILE = Symbol('no ava.config.js file');
const MISSING_DEFAULT_EXPORT = Symbol('missing default export');
const EXPERIMENTS = new Set(['disableSnapshotsInHooks', 'reverseTeardowns']);

// *Very* rudimentary support for loading ava.config.js files containing an `export default` statement.
const evaluateJsConfig = configFile => {
	const contents = fs.readFileSync(configFile, 'utf8');
	const script = new vm.Script(`'use strict';(()=>{let __export__;\n${contents.replace(/export default/g, '__export__ =')};return __export__;})()`, {
		filename: configFile,
		lineOffset: -1
	});
	return {
		default: script.runInThisContext()
	};
};

const loadJsConfig = ({projectDir, configFile = path.join(projectDir, 'ava.config.js')}) => {
	if (!configFile.endsWith('.js')) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);

	let config;
	try {
		({default: config = MISSING_DEFAULT_EXPORT} = evaluateJsConfig(configFile));
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

const loadMjsConfig = ({projectDir, configFile = path.join(projectDir, 'ava.config.mjs')}) => {
	if (!configFile.endsWith('.mjs')) {
		return null;
	}

	const fileForErrorMessage = path.relative(projectDir, configFile);
	try {
		fs.readFileSync(configFile);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return null;
		}

		throw Object.assign(new Error(`Error loading ${fileForErrorMessage}`), {parent: error});
	}

	throw new Error(`AVA cannot yet load ${fileForErrorMessage} files`);
};

function loadConfig({configFile, resolveFrom = process.cwd(), defaults = {}} = {}) { // eslint-disable-line complexity
	let packageConf = pkgConf.sync('ava', {cwd: resolveFrom});
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? resolveFrom : path.dirname(filepath);

	if (configFile) {
		configFile = path.resolve(configFile); // Relative to CWD
		if (path.basename(configFile) !== path.relative(projectDir, configFile)) {
			throw new Error('Config files must be located next to the package.json file');
		}

		if (!configFile.endsWith('.js') && !configFile.endsWith('.cjs') && !configFile.endsWith('.mjs')) {
			throw new Error('Config files must have .js, .cjs or .mjs extensions');
		}
	}

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

module.exports = loadConfig;
