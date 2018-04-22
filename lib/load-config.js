'use strict';
require = require('esm')(module); // eslint-disable-line no-global-assign
const path = require('path');
const fs = require('fs');
// ESM seems to break `path` and `fs`, require them first before setting it up..
const pkgConf = require('pkg-conf');

const loadConfigFile = (projectDir) => {
	const loaded = require(path.resolve(projectDir, 'ava.config.js'));
	const config = (loaded.__esModule) ? loaded.default : loaded;
	if (config.then) {
		throw new Error('Config file must not return a promise');
	}
	return (typeof config === 'function') ? config({projectDir}) : config;
};

const load = (opts = {}) => {
	const defaults = opts.defaults || {};
	const packageConf = pkgConf.sync('ava');
	const filepath = pkgConf.filepath(packageConf);
	const projectDir = filepath === null ? process.cwd() : path.dirname(filepath);
	const configPath = path.resolve(projectDir, 'ava.config.js');
	const configFileExists = fs.existsSync(configPath);

	// If both a file and package configuration are present, throw a warning
	if (configFileExists && packageConf && Object.keys(packageConf).length > 0) {
		throw new Error('Warning: You have configuration settings in both package.json and ava.config.js. Please use only one or the other.');
	}

	const config = configFileExists ? loadConfigFile(projectDir) : packageConf;
	return Object.assign({}, defaults, config, {projectDir});
};

module.exports = load;
