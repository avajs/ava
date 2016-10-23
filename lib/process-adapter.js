'use strict';
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var sourceMapSupport = require('source-map-support');
var installPrecompiler = require('require-precompiled');

var debug = require('debug')('ava');

// check if the test is being run without AVA cli
var isForked = typeof process.send === 'function';

if (!isForked) {
	var fp = path.relative('.', process.argv[1]);

	console.log();
	console.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + fp) + '\n');

	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

exports.send = function (name, data) {
	process.send({
		name: 'ava-' + name,
		data: data,
		ava: true
	});
};

exports.on = process.on.bind(process);
exports.emit = process.emit.bind(process);
exports.exit = process.exit.bind(process);
exports.env = process.env;

var opts = exports.opts = JSON.parse(process.argv[2]);

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

if (debug.enabled) {
	// Forward the `time-require` `--sorted` flag.
	// Intended for internal optimization tests only.
	if (opts._sorted) {
		process.argv.push('--sorted');
	}

	require('time-require'); // eslint-disable-line import/no-unassigned-import
}

var sourceMapCache = Object.create(null);
var cacheDir = opts.cacheDir;

exports.installSourceMapSupport = function () {
	sourceMapSupport.install({
		environment: 'node',
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
};

exports.installPrecompilerHook = function () {
	installPrecompiler(function (filename) {
		var precompiled = opts.precompiled[filename];

		if (precompiled) {
			sourceMapCache[filename] = path.join(cacheDir, precompiled + '.js.map');
			return fs.readFileSync(path.join(cacheDir, precompiled + '.js'), 'utf8');
		}

		return null;
	});
};

exports.installDependencyTracking = function (dependencies, testPath) {
	Object.keys(require.extensions).forEach(function (ext) {
		var wrappedHandler = require.extensions[ext];
		require.extensions[ext] = function (module, filename) {
			if (filename !== testPath) {
				dependencies.push(filename);
			}

			wrappedHandler(module, filename);
		};
	});
};
