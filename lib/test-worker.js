'use strict';
var opts = JSON.parse(process.argv[2]);
var testPath = opts.file;

// Fake TTY support
if (opts.tty) {
	process.stdout.isTTY = true;
	process.stdout.columns = opts.tty.columns || 80;
	process.stdout.rows = opts.tty.rows;

	var tty = require('tty');
	var isatty = tty.isatty;

	tty.isatty = function (fd) {
		if (fd === 1 || fd === process.stdout) {
			return true;
		}

		return isatty(fd);
	};
}

var path = require('path');
var fs = require('fs');
var debug = require('debug')('ava');
var sourceMapSupport = require('source-map-support');

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
globals.options = opts;
var Promise = require('bluebird');

// Bluebird specific
Promise.longStackTraces();

(opts.require || []).forEach(require);

var sourceMapCache = Object.create(null);

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
var beautifyStack = require('./beautify-stack');
var send = require('./send');
var installPrecompiler = require('require-precompiled');
var cacheDir = opts.cacheDir;

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

// Modules need to be able to find `babel-runtime`, which is nested in our node_modules w/ npm@2
var nodeModulesDir = path.join(__dirname, '../node_modules');
var oldNodeModulesPaths = module.constructor._nodeModulePaths;
module.constructor._nodeModulePaths = function () {
	var ret = oldNodeModulesPaths.apply(this, arguments);
	ret.push(nodeModulesDir);
	return ret;
};

var dependencies = [];
Object.keys(require.extensions).forEach(function (ext) {
	var wrappedHandler = require.extensions[ext];
	require.extensions[ext] = function (module, filename) {
		if (filename !== testPath) {
			dependencies.push(filename);
		}
		wrappedHandler(module, filename);
	};
});

require(testPath);

process.on('uncaughtException', function (exception) {
	var serialized = serializeError(exception);
	if (serialized.stack) {
		serialized.stack = beautifyStack(serialized.stack);
	}
	send('uncaughtException', {exception: serialized});
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

var tearingDown = false;
process.on('ava-teardown', function () {
	// ava-teardown can be sent more than once.
	if (tearingDown) {
		return;
	}
	tearingDown = true;

	var rejections = loudRejection.currentlyUnhandled();

	if (rejections.length === 0) {
		exit();
		return;
	}

	rejections = rejections.map(function (rejection) {
		var error = serializeError(rejection.reason);
		if (error.stack) {
			error.stack = beautifyStack(error.stack);
		}
		return error;
	});

	send('unhandledRejections', {rejections: rejections});
	globals.setTimeout(exit, 100);
});

function exit() {
	// Include dependencies in the final teardown message. This ensures the full
	// set of dependencies is included no matter how the process exits, unless
	// it flat out crashes.
	send('teardown', {dependencies: dependencies});
}
