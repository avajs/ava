'use strict';
const path = require('path');
const fs = require('fs');
const pkgConf = require('pkg-conf');

const findFileUp = pattern => (searchDir = process.cwd()) => {
	const files = fs.readdirSync(searchDir);
	const foundFile = files ?
		files.find(entry => pattern instanceof RegExp ? entry.match(pattern) : entry === pattern) :
		false;
	if (foundFile) {
		return path.resolve(searchDir, foundFile);
	}
	if (searchDir === '/') {
		return false;
	}
	return findFileUp(pattern)(path.resolve(searchDir, '..'));
};

const findPackageDotJson = findFileUp('package.json');

const findConfigFile = findFileUp(/ava\.config(\.\w+)?\.js/);

const findConfigFiles = () => {
	const packageFile = findPackageDotJson();
	const configFile = findConfigFile(
		packageFile ? path.dirname(packageFile) : process.cwd(),
	);
	return {
		packageFile,
		configFile
	};
};

const init = (opts = {}) => {
	const {packageFile, configFile} = findConfigFiles();
	const defaults = opts.defaults || {};

	const packageValues = packageFile ? pkgConf.sync('ava') : false;

	// If both options are present
	if (packageValues && Object.keys(packageValues).length > 0 && configFile) {
		throw new Error(
			'Warning: You have configuration settings in both package.json and ava.config.js. Please use only one or the other.',
		);
	}

	// If values are in package.json
	if (packageValues && Object.keys(packageValues).length > 0) {
		const config = {
			...packageValues,
			...defaults
		};
		return config;
	}

	// If values are in a config file
	if (configFile) {
		const configValues = require(configFile);
		const config = {
			...configValues,
			...defaults
		};
		return config;
	}

	// If neither are present, but opts are supplied
	if (opts) {
		const config = {
			...opts
		};
		return config;
	}

	throw new Error('No config or defaults');
};

const getProjectDir = () => {
	const {packageFile, configFile} = findConfigFiles();
	if (packageFile) {
		return path.dirname(packageFile);
	}
	if (configFile) {
		return path.dirname(configFile);
	}
	return process.cwd();
};

module.exports = init;
module.exports.projectDir = getProjectDir;
