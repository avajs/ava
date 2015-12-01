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
var requireFromString = require('require-from-string');
var loudRejection = require('loud-rejection/api')(process);
var resolveFrom = require('resolve-from');
var hasGenerator = require('has-generator');
var serializeError = require('serialize-error');
var path = require('path');
var fs = require('fs');
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

// if generators are not supported, use regenerator
var options = {
	blacklist: hasGenerator ? ['regenerator'] : [],
	optional: hasGenerator ? ['asyncToGenerator', 'runtime'] : ['runtime'],
	plugins: [powerAssert],
	sourceMaps: true,
	inputSourceMap: null,
	filename: testPath
};

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

process.on('uncaughtException', function (exception) {
	send('uncaughtException', {exception: serializeError(exception)});
});

// try to load an input source map for the test file, in case the file was
// already compiled once by the user
var inputSourceMap = sourceMapSupport.retrieveSourceMap(testPath);
if (inputSourceMap) {
	// source-map-support returns the source map as a json-encoded string, but
	// babel requires an actual object
	options.inputSourceMap = JSON.parse(inputSourceMap.map);
}

// load up custom compilers
process.argv.slice(3).forEach(function (arg) {
	var match = /^--compilers=.+?:(.+)$/i.exec(arg);
	if (match) {
		require(match[1]);
	}
});

// include test file
var Module = module.constructor;
var source = fs.readFileSync(testPath, 'utf8');
var extension = path.extname(testPath);

var compiler = Module._extensions[extension];
if (compiler) {
	compiler(
		{
			_compile: function (s, f) {
				source = s;
				testPath = f;
			}
		},
		testPath
	);
}

var transpiled = babel.transform(source, options);
sourceMapCache[testPath] = transpiled.map;
requireFromString(transpiled.code, testPath, {
	appendPaths: module.paths
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
