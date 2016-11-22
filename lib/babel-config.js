'use strict';
const path = require('path');
const chalk = require('chalk');
const figures = require('figures');
const convertSourceMap = require('convert-source-map');
const semver = require('semver');
const colors = require('./colors');

function validate(conf) {
	if (conf === undefined || conf === null) {
		conf = 'default';
	}

	// check for valid babel config shortcuts (can be either `default` or `inherit`)
	const isValidShortcut = conf === 'default' || conf === 'inherit';

	if (!conf || (typeof conf === 'string' && !isValidShortcut)) {
		let message = colors.error(figures.cross);
		message += ' Unexpected Babel configuration for AVA. ';
		message += 'See ' + chalk.underline('https://github.com/avajs/ava#es2015-support') + ' for allowed values.';

		throw new Error(message);
	}

	return conf;
}

function lazy(initFn) {
	let initialized = false;
	let value;

	return () => {
		if (!initialized) {
			initialized = true;
			value = initFn();
		}

		return value;
	};
}

const defaultPresets = lazy(() => {
	const esPreset = semver.satisfies(process.version, '>=6') ?
		'babel-preset-node6' :
		'babel-preset-es2015-node4';

	return [
		require('babel-preset-stage-2'),
		require(esPreset) // eslint-disable-line import/no-dynamic-require
	];
});

const rewritePlugin = lazy(() => {
	const wrapListener = require('babel-plugin-detective/wrap-listener');

	return wrapListener(rewriteBabelRuntimePaths, 'rewrite-runtime', {
		generated: true,
		require: true,
		import: true
	});
});

function rewriteBabelRuntimePaths(path) {
	const isBabelPath = /^babel-runtime[\\/]?/.test(path.node.value);

	if (path.isLiteral() && isBabelPath) {
		path.node.value = require.resolve(path.node.value);
	}
}

const espowerPlugin = lazy(() => {
	const babel = require('babel-core');
	const createEspowerPlugin = require('babel-plugin-espower/create');

	// initialize power-assert
	return createEspowerPlugin(babel, {
		embedAst: true,
		patterns: require('./enhance-assert').PATTERNS
	});
});

const defaultPlugins = lazy(() => {
	return [
		require('babel-plugin-ava-throws-helper'),
		rewritePlugin(),
		require('babel-plugin-transform-runtime')
	];
});

function build(babelConfig, powerAssert, filePath, code) {
	babelConfig = validate(babelConfig);

	let options;

	if (babelConfig === 'default') {
		options = {
			babelrc: false,
			presets: defaultPresets()
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

	options.plugins = (options.plugins || [])
		.concat(powerAssert ? espowerPlugin() : [])
		.concat(defaultPlugins());

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
	pluginPackages: [
		require.resolve('babel-core/package.json'),
		require.resolve('babel-plugin-espower/package.json')
	]
};
