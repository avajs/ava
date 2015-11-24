'use strict';
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
	sourceMaps: true
};

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

process.on('uncaughtException', function (exception) {
	send('uncaughtException', {exception: serializeError(exception)});
});

// include test file
var transpiled = babel.transformFileSync(testPath, options);
sourceMapCache[testPath] = JSON.stringify(transpiled.map);
requireFromString(transpiled.code, testPath, {
	appendPaths: module.paths
});

// if ava was not required, show an error
if (!exports.avaRequired) {
	throw new Error('No tests found in ' + testPath + ', make sure to import "ava" at the top of your test file');
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

	setTimeout(function () {
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
	setTimeout(exit, 100);
});

function exit() {
	send('teardown');
}
