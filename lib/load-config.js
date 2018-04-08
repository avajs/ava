'use strict';
const path = require('path');
const fs = require('fs');
const pkgConf = require('pkg-conf');


const load = (opts = {}) => {
	const defaults = opts.defaults || {};
	const packageConf = pkgConf.sync('ava');
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? process.cwd() : path.dirname(filepath);
	const configPath = path.resolve(projectDir, 'ava.config.js');
	const configFileExists = fs.existsSync(configPath)

	// If both a file and package configuration are present, throw a warning
	if (configFileExists && packageConf && Object.keys(packageConf).length > 0) {
		throw new Error(
			'Warning: You have configuration settings in both package.json and ava.config.js. Please use only one or the other.',
		);
	}

	const config = configFileExists ? require(configPath) : packageConf;

	return {
		...config,
		...defaults,
		_meta: {
			projectDir
		}
	}
};



module.exports = load;
