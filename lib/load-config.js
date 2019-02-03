'use strict';
const path = require('path');
const esm = require('esm');
const isPlainObject = require('is-plain-object');
const pkgConf = require('pkg-conf');

const NO_SUCH_FILE = Symbol('no ava.config.js file');
const MISSING_DEFAULT_EXPORT = Symbol('missing default export');

function loadConfig(defaults = {}) {
	const packageConf = pkgConf.sync('ava');
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? process.cwd() : path.dirname(filepath);

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
		})(path.join(projectDir, 'ava.config.js')));
	} catch (error) {
		if (error && error.code === 'MODULE_NOT_FOUND') {
			fileConf = NO_SUCH_FILE;
		} else {
			throw Object.assign(new Error('Error loading ava.config.js'), {parent: error});
		}
	}

	if (fileConf === MISSING_DEFAULT_EXPORT) {
		throw new Error('ava.config.js must have a default export, using ES module syntax');
	}

	if (fileConf !== NO_SUCH_FILE) {
		if (Object.keys(packageConf).length > 0) {
			throw new Error('Conflicting configuration in ava.config.js and package.json');
		}

		if (fileConf && typeof fileConf.then === 'function') {
			throw new TypeError('ava.config.js must not export a promise');
		}

		if (!isPlainObject(fileConf) && typeof fileConf !== 'function') {
			throw new TypeError('ava.config.js must export a plain object or factory function');
		}

		if (typeof fileConf === 'function') {
			fileConf = fileConf({projectDir});
			if (fileConf && typeof fileConf.then === 'function') {
				throw new TypeError('Factory method exported by ava.config.js must not return a promise');
			}

			if (!isPlainObject(fileConf)) {
				throw new TypeError('Factory method exported by ava.config.js must return a plain object');
			}
		}

		if ('ava' in fileConf) {
			throw new Error('Encountered \'ava\' property in ava.config.js; avoid wrapping the configuration');
		}
	}

	return Object.assign({}, defaults, fileConf, packageConf, {projectDir});
}

module.exports = loadConfig;
