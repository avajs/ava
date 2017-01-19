'use strict';
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const sourceMapSupport = require('source-map-support');
const installPrecompiler = require('require-precompiled');

const debug = require('debug')('ava');

// Check if the test is being run without AVA cli
const isForked = typeof process.send === 'function';

if (!isForked) {
	const fp = path.relative('.', process.argv[1]);

	console.log();
	console.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + fp) + '\n');

	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

exports.send = (name, data) => {
	process.send({
		name: `ava-${name}`,
		data,
		ava: true
	});
};

exports.on = process.on.bind(process);
exports.emit = process.emit.bind(process);
exports.exit = process.exit.bind(process);
exports.env = process.env;

const opts = exports.opts = JSON.parse(process.argv[2]);

// Fake TTY support
if (opts.tty) {
	process.stdout.isTTY = true;
	process.stdout.columns = opts.tty.columns || 80;
	process.stdout.rows = opts.tty.rows;

	const tty = require('tty');
	const isatty = tty.isatty;

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

const sourceMapCache = new Map();
const cacheDir = opts.cacheDir;

exports.installSourceMapSupport = () => {
	sourceMapSupport.install({
		environment: 'node',
		handleUncaughtExceptions: false,
		retrieveSourceMap(source) {
			if (sourceMapCache.has(source)) {
				return {
					url: source,
					map: fs.readFileSync(sourceMapCache.get(source), 'utf8')
				};
			}
		}
	});
};

exports.installPrecompilerHook = () => {
	installPrecompiler(filename => {
		const precompiled = opts.precompiled[filename];

		if (precompiled) {
			sourceMapCache.set(filename, path.join(cacheDir, `${precompiled}.js.map`));
			return fs.readFileSync(path.join(cacheDir, `${precompiled}.js`), 'utf8');
		}

		return null;
	});
};

exports.installDependencyTracking = (dependencies, testPath) => {
	Object.keys(require.extensions).forEach(ext => {
		const wrappedHandler = require.extensions[ext];

		require.extensions[ext] = (module, filename) => {
			if (filename !== testPath) {
				dependencies.push(filename);
			}

			wrappedHandler(module, filename);
		};
	});
};
