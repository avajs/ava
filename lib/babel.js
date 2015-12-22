'use strict';

var debug = require('debug')('ava');

var opts = JSON.parse(process.argv[2]);

if (debug.enabled) {
	// Forward the `time-require` `--sorted` flag.
	// Intended for internal optimization tests only.
	if (opts._sorted) {
		process.argv.push('--sorted');
	}
	require('time-require');
}

// Bind globals first, before anything has a chance to interfere.
var globals = require('./globals');

(opts.require || []).forEach(require);

var sourceMapCache = Object.create(null);

var fs = require('fs');
var sourceMapSupport = require('source-map-support');
sourceMapSupport.install({
	handleUncaughtExceptions: false,
	retrieveSourceMap: function (source) {
		if (sourceMapCache[source]) {
			return {
				url: source,
				map: fs.readFileSync(sourceMapCache[source], 'utf8')
			};
		}
	}
});

var loudRejection = require('loud-rejection/api')(process);
var serializeError = require('serialize-error');
var send = require('./send');
var installPrecompiler = require('require-precompiled');
var path = require('path');
var cacheDir = path.join(module.paths[1], '.cache', 'ava');

var testPath = opts.file;

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

installPrecompiler(function (filename) {
	var precompiled = opts.precompiled[filename];
	if (precompiled) {
		sourceMapCache[filename] = path.join(cacheDir, precompiled + '.map');
		return fs.readFileSync(path.join(cacheDir, precompiled + '.js'), 'utf8');
	}
	return null;
});

require(testPath);

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
