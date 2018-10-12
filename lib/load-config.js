'use strict';
const path = require('path');
const esm = require('esm');
const pkgConf = require('pkg-conf');
const isPlainObject = require('is-plain-object');

const NO_SUCH_FILE = Symbol('no ava.config.js file');
const MISSING_DEFAULT_EXPORT = Symbol('missing default export');

module.exports = async (defaults = {}) => {
	let fileConf;
	const packageConf = pkgConf.sync('ava');
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? process.cwd() : path.dirname(filepath);

	const esmRequire = esm(module, {
		cjs: false,
		force: true,
		mode: 'all'
	});

	try {
		const requireResult = await esmRequire(path.join(projectDir, 'ava.config.js'));
		({default: fileConf = MISSING_DEFAULT_EXPORT} = requireResult);
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
        console.log(packageConf)
		if (Object.keys(packageConf).length > 0) {
			throw new Error('Conflicting configuration in ava.config.js and package.json');
		}

		if (!isPlainObject(fileConf) && typeof fileConf !== 'function') {
			throw new TypeError('ava.config.js must export a plain object or factory function');
		}

		if (typeof fileConf === 'function') {
			fileConf = fileConf({projectDir});
			if (!isPlainObject(fileConf)) {
				throw new TypeError('Factory method exported by ava.config.js must return a plain object');
			}
		}
	}

	return Object.assign({}, defaults, fileConf, packageConf, {projectDir});
};
