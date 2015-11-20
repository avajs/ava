'use strict';
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');
var loudRejection = require('loud-rejection/api')(process);
var resolveFrom = require('resolve-from');
var serializeValue = require('./serialize-value');
var send = require('./send');

var testPath = process.argv[2];

// include local babel and fallback to ava's babel
var babel;

try {
	var localBabel = resolveFrom('.', 'babel-core');
	babel = require(localBabel);
} catch (err) {
	babel = require('babel-core');
}

// initialize power-assert
var powerAssert = createEspowerPlugin(babel, {
	patterns: require('./enhance-assert').PATTERNS
});

var options = {
	presets: ['stage-3', 'es2015'],
	plugins: [powerAssert, 'transform-runtime']
};

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

process.on('uncaughtException', function (exception) {
	send('uncaughtException', {exception: serializeValue(exception)});
});

// include test file
var transpiled = babel.transformFileSync(testPath, options);
requireFromString(transpiled.code, testPath);

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
		return serializeValue(rejection.reason);
	});

	send('unhandledRejections', {rejections: rejections});
	setTimeout(exit, 100);
});

function exit() {
	send('teardown');
}
