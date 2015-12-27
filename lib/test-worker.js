'use strict';
var path = require('path');
var debug = require('debug')('ava');
var pkgDir = require('pkg-dir').sync;
var hasha = require('hasha');
var cacha = require('cacha');
var sourceMapSupport = require('source-map-support');

var opts = JSON.parse(process.argv[2]);
var testPath = opts.file;

var cache = cacha(path.join(pkgDir(path.dirname(testPath)), 'node_modules', '.cache', 'ava'));

if (debug.enabled) {
	// Forward the `time-require` `--sorted` flag.
	// Intended for internal optimization tests only.
	if (opts._sorted) {
		process.argv.push('--sorted');
	}

	require('time-require');
}

// bind globals first before anything has a chance to interfere
var globals = require('./globals');

(opts.require || []).forEach(require);

var sourceMapCache = Object.create(null);

sourceMapSupport.install({
	handleUncaughtExceptions: false,
	retrieveSourceMap: function (source) {
		if (sourceMapCache[source]) {
			return {
				url: source,
				map: sourceMapCache[source]
			};
		}
	}
});

var requireFromString = require('require-from-string');
var loudRejection = require('loud-rejection/api')(process);
var serializeError = require('serialize-error');
var send = require('./send');

// if generators are not supported, use regenerator
var options = {
	sourceMaps: true
};

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

// try to load an input source map for the test file, in case the file was
// already compiled once by the user
var inputSourceMap = sourceMapSupport.retrieveSourceMap(testPath);
if (inputSourceMap) {
	// source-map-support returns the source map as a json-encoded string, but
	// babel requires an actual object
	options.inputSourceMap = JSON.parse(inputSourceMap.map);
}

// include test file
var cachePath = hasha(cacheKey(testPath));
var hashPath = cachePath + '_hash';

var prevHash = cache.getSync(hashPath, {encoding: 'utf8'});
var currHash = hasha.fromFileSync(testPath);

if (prevHash === currHash) {
	var cached = JSON.parse(cache.getSync(cachePath));

	sourceMapCache[testPath] = cached.map;
	requireFromString(cached.code, testPath, {
		appendPaths: module.paths
	});
} else {
	var createEspowerPlugin = require('babel-plugin-espower/create');
	var babel = require('babel-core');

	// initialize power-assert
	var powerAssert = createEspowerPlugin(babel, {
		patterns: require('./enhance-assert').PATTERNS
	});

	options.presets = [require('babel-preset-stage-2'), require('babel-preset-es2015')];
	options.plugins = [powerAssert, require('babel-plugin-transform-runtime')];

	var transpiled = babel.transformFileSync(testPath, options);

	cache.setSync(hashPath, currHash);
	cache.setSync(cachePath, JSON.stringify({
		code: transpiled.code,
		map: transpiled.map
	}));

	sourceMapCache[testPath] = transpiled.map;
	requireFromString(transpiled.code, testPath, {
		appendPaths: module.paths
	});
}

process.on('uncaughtException', function (exception) {
	send('uncaughtException', {exception: serializeError(exception)});
});

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

function cacheKey(path) {
	var key = path;

	key += require('../package.json').version;
	key += require('babel-core/package.json').version;
	key += require('babel-plugin-espower/package.json').version;
	key += require('babel-plugin-transform-runtime/package.json').version;
	key += require('babel-preset-stage-2/package.json').version;
	key += require('babel-preset-es2015/package.json').version;

	return hasha(key);
}
