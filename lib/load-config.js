'use strict';
const path = require('path');
const esm = require('esm');
const isPlainObject = require('is-plain-object');
const pkgConf = require('pkg-conf');

const NO_SUCH_FILE = Symbol('no ava.config.js file');
const MISSING_DEFAULT_EXPORT = Symbol('missing default export');

function loadConfig({configFile, resolveFrom = process.cwd(), defaults = {}} = {}) { // eslint-disable-line complexity
	let packageConf = pkgConf.sync('ava', {cwd: resolveFrom});
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? resolveFrom : path.dirname(filepath);

	const fileForErrorMessage = configFile || 'ava.config.js';
	const allowConflictWithPackageJson = Boolean(configFile);

	if (configFile) {
		configFile = path.resolve(configFile); // Relative to CWD
		if (path.basename(configFile) !== path.relative(projectDir, configFile)) {
			throw new Error('Config files must be located next to the package.json file');
		}
	} else {
		configFile = path.join(projectDir, 'ava.config.js');
	}

	let fileConf;
	try {
		({default: fileConf = MISSING_DEFAULT_EXPORT} = esm(module, {
			cjs: {
				cache: false,
				extensions: false,
				interop: false,
				mutableNamespace: false,
				namedExports: false,
				paths: false,
				vars: true
			},
			force: true,
			mode: 'all'
		})(configFile));
	} catch (error) {
		if (error && error.code === 'MODULE_NOT_FOUND') {
			fileConf = NO_SUCH_FILE;
		} else {
			throw Object.assign(new Error(`Error loading ${fileForErrorMessage}`), {parent: error});
		}
	}

	if (fileConf === MISSING_DEFAULT_EXPORT) {
		throw new Error(`${fileForErrorMessage} must have a default export, using ES module syntax`);
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
			throw new Error(`Encountered 'ava' property in ${fileForErrorMessage}; avoid wrapping the configuration`);
		}
	}

	return {...defaults, ...fileConf, ...packageConf, projectDir};
}

module.exports = loadConfig;
