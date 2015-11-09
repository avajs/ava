'use strict';
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');
var loudRejection = require('loud-rejection/api')(process);
var resolveFrom = require('resolve-from');
var hasGenerator = require('has-generator');
var serializeValue = require('./serialize-value');
var send = require('./send');
var hasha = require('hasha');
var hashObj = require('hash-obj');
var xdgBasedir = require('xdg-basedir');
var path = require('path');
var cache = require('cacha')(path.join(xdgBasedir.cache, 'ava'));

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
	plugins: [powerAssert]
};

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

process.on('uncaughtException', function (exception) {
	send('uncaughtException', {exception: serializeValue(exception)});
});

var hash = hashObj({
	code: hasha.fromFileSync(testPath),
	avaVersion: require('../package.json').version
});

var code = cache.getSync(hash, 'utf8');

if (code === undefined) {
	code = babel.transformFileSync(testPath, options).code;
	cache.setSync(hash, code, 'utf8');
}

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

// include test file
requireFromString(code, testPath, {
	appendPaths: module.paths
});

// if ava was not required, show an error
if (!exports.avaRequired) {
	throw new Error('No tests found in ' + testPath + ', make sure to import "ava" at the top of your test file');
}

function exit() {
	send('teardown');
}
