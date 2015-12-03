'use strict';

var debug = require('debug')('ava');

if (debug.enabled) {
	require('time-require');
}

// Bind globals first, before anything has a chance to interfere.
var globals = require('./globals');

var sourceMapCache = Object.create(null);

var sourceMapSupport = require('source-map-support');
sourceMapSupport.install({
	retrieveSourceMap: function (source) {
		if (sourceMapCache[source]) {
			return {
				url: source,
				map: sourceMapCache[source]
			};
		}
		return sourceMapSupport.retrieveSourceMap(source);
	}
});

var createEspowerPlugin = require('babel-plugin-espower/create');
var libHook = require('istanbul-lib-hook');
var path = require('path');
var loudRejection = require('loud-rejection/api')(process);
var resolveFrom = require('resolve-from');
var hasGenerator = require('has-generator');
var serializeError = require('serialize-error');
var send = require('./send');

var testPath = process.argv[2];

// include local babel and fallback to ava's babel
var babel;

try {
	var localBabel = resolveFrom('.', 'babel-core') || resolveFrom('.', 'babel');
	babel = require(localBabel);
} catch (err) {
	babel = require('babel-core');
}

// initialize power-assert
var powerAssert = createEspowerPlugin(babel, {
	patterns: require('./enhance-assert').PATTERNS
});

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

process.on('uncaughtException', function (exception) {
	send('uncaughtException', {exception: serializeError(exception)});
});

// Append AVA's node_modules paths, this is so users don't need to install Babel as a dependency.
var Module = module.constructor;
var originalNodeModulePaths = Module._nodeModulePaths;
var pathToAppend = path.join(__dirname, '../node_modules');
Module._nodeModulePaths = function () {
	var paths = originalNodeModulePaths.apply(this, arguments);
	return paths.concat([pathToAppend]);
};

// Install a require hook.

// Currently only matches the test file. Easy to extend.
function matcher(file) {
	return file === testPath;
}

function transform(code, file) {
	// if generators are not supported, use regenerator
	var options = {
		blacklist: hasGenerator ? ['regenerator'] : [],
		optional: hasGenerator ? ['asyncToGenerator', 'runtime'] : ['runtime'],
		plugins: [powerAssert],
		sourceMaps: true,
		filename: file
	};

	// try to load an input source map for the test file, in case the file was
	// already compiled once by the user
	var inputSourceMap = sourceMapSupport.retrieveSourceMap(file);
	if (inputSourceMap) {
		// source-map-support returns the source map as a json-encoded string, but
		// babel requires an actual object
		options.inputSourceMap = JSON.parse(inputSourceMap.map);
	}

	var transpiled = babel.transform(code, options);
	sourceMapCache[testPath] = transpiled.map;
	return transpiled.code;
}

libHook.hookRequire(matcher, transform);

require(testPath);

// if ava was not required, show an error
if (!exports.avaRequired) {
	send('no-tests', {avaRequired: false});
}

// parse and re-emit ava messages
process.on('message', function (message) {
	if (!message.ava) {
		return;
	}

	process.emit(message.name, message.data);
});

process.on('ava-exit', function () {
	// use a little delay when running on AppVeyor (because it's shit)
	var delay = process.env.AVA_APPVEYOR ? 100 : 0;

	globals.setTimeout(function () {
		process.exit(0);
	}, delay);
});

process.on('ava-teardown', function () {
	var rejections = loudRejection.currentlyUnhandled();

	if (rejections.length === 0) {
		return exit();
	}

	rejections = rejections.map(function (rejection) {
		return serializeError(rejection.reason);
	});

	send('unhandledRejections', {rejections: rejections});
	globals.setTimeout(exit, 100);
});

function exit() {
	send('teardown');
}
