'use strict';
const path = require('path');
const chalk = require('chalk');
const figures = require('figures');
const convertSourceMap = require('convert-source-map');
const colors = require('./colors');

function validate(conf) {
	if (conf === undefined || conf === null) {
		conf = 'default';
	}

	// Check for valid babel config shortcuts (can be either `default` or `inherit`)
	const isValidShortcut = conf === 'default' || conf === 'inherit';

	if (!conf || (typeof conf === 'string' && !isValidShortcut)) {
		let message = colors.error(figures.cross);
		message += ' Unexpected Babel configuration for AVA. ';
		message += 'See ' + chalk.underline('https://github.com/avajs/ava#es2015-support') + ' for allowed values.';

		throw new Error(message);
	}

	return conf;
}

function lazy(buildPreset) {
	let preset;

	return babel => {
		if (!preset) {
			preset = buildPreset(babel);
		}

		return preset;
	};
}

const stage4 = lazy(() => require('@ava/babel-preset-stage-4')());

function makeTransformTestFiles(powerAssert) {
	return lazy(babel => {
		return require('@ava/babel-preset-transform-test-files')(babel, {powerAssert});
	});
}

function build(babelConfig, powerAssert, filePath, code) {
	babelConfig = validate(babelConfig);

	let options;

	if (babelConfig === 'default') {
		options = {
			babelrc: false,
			presets: [stage4]
		};
	} else if (babelConfig === 'inherit') {
		options = {
			babelrc: true
		};
	} else {
		options = {
			babelrc: false
		};

		Object.assign(options, babelConfig);
	}

	const sourceMap = getSourceMap(filePath, code);

	Object.assign(options, {
		inputSourceMap: sourceMap,
		filename: filePath,
		sourceMaps: true,
		ast: false
	});

	if (!options.presets) {
		options.presets = [];
	}
	options.presets.push(makeTransformTestFiles(powerAssert));

	return options;
}

function getSourceMap(filePath, code) {
	let sourceMap = convertSourceMap.fromSource(code);

	if (!sourceMap) {
		const dirPath = path.dirname(filePath);
		sourceMap = convertSourceMap.fromMapFileSource(code, dirPath);
	}

	if (sourceMap) {
		sourceMap = sourceMap.toObject();
	}

	return sourceMap;
}

module.exports = {
	validate,
	build,
	presetHashes: [
		require('@ava/babel-preset-stage-4/package-hash'),
		require('@ava/babel-preset-transform-test-files/package-hash')
	]
};
