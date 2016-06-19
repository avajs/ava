'use strict';
var path = require('path');
var chalk = require('chalk');
var figures = require('figures');
var convertSourceMap = require('convert-source-map');
var objectAssign = require('object-assign');
var colors = require('./colors');

function validate(conf) {
	if (conf === undefined || conf === null) {
		conf = 'default';
	}

	// check for valid babel config shortcuts (can be either "default" or "inherit")
	var isValidShortcut = conf === 'default' || conf === 'inherit';

	if (!conf || (typeof conf === 'string' && !isValidShortcut)) {
		var message = colors.error(figures.cross);
		message += ' Unexpected Babel configuration for AVA. ';
		message += 'See ' + chalk.underline('https://github.com/avajs/ava#es2015-support') + ' for allowed values.';

		throw new Error(message);
	}

	return conf;
}

function lazy(initFn) {
	var initialized = false;
	var value;

	return function () {
		if (!initialized) {
			initialized = true;
			value = initFn();
		}

		return value;
	};
}

var defaultPresets = lazy(function () {
	return [
		require('babel-preset-stage-2'),
		require('babel-preset-es2015')
	];
});

var rewritePlugin = lazy(function () {
	var wrapListener = require('babel-plugin-detective/wrap-listener');

	return wrapListener(rewriteBabelRuntimePaths, 'rewrite-runtime', {
		generated: true,
		require: true,
		import: true
	});
});

function rewriteBabelRuntimePaths(path) {
	var isBabelPath = /^babel-runtime[\\\/]?/.test(path.node.value);

	if (path.isLiteral() && isBabelPath) {
		path.node.value = require.resolve(path.node.value);
	}
}

var espowerPlugin = lazy(function () {
	var babel = require('babel-core');
	var createEspowerPlugin = require('babel-plugin-espower/create');

	// initialize power-assert
	return createEspowerPlugin(babel, {
		embedAst: true,
		patterns: require('./enhance-assert').PATTERNS
	});
});

var defaultPlugins = lazy(function () {
	return [
		espowerPlugin(),
		require('babel-plugin-ava-throws-helper'),
		rewritePlugin(),
		require('babel-plugin-transform-runtime')
	];
});

function build(babelConfig, filePath, code) {
	babelConfig = validate(babelConfig);

	var options;

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

		objectAssign(options, babelConfig);
	}

	var sourceMap = getSourceMap(filePath, code);

	objectAssign(options, {
		inputSourceMap: sourceMap,
		filename: filePath,
		sourceMaps: true,
		ast: false
	});

	options.plugins = (options.plugins || []).concat(defaultPlugins());

	return options;
}

function getSourceMap(filePath, code) {
	var sourceMap = convertSourceMap.fromSource(code);

	if (!sourceMap) {
		var dirPath = path.dirname(filePath);

		sourceMap = convertSourceMap.fromMapFileSource(code, dirPath);
	}

	if (sourceMap) {
		sourceMap = sourceMap.toObject();
	}

	return sourceMap;
}

module.exports = {
	validate: validate,
	build: build,
	pluginPackages: [
		require.resolve('babel-core/package.json'),
		require.resolve('babel-plugin-espower/package.json')
	]
};
