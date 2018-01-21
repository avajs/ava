'use strict';
const fs = require('fs');
const path = require('path');
const debug = require('debug')('ava');
const sourceMapSupport = require('source-map-support');
const installPrecompiler = require('require-precompiled');
const mem = require('mem');

// Fake TTY support
exports.setupFakeTTY = mem(opts => {
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
});

exports.setupTimeRequire = mem(opts => {
	if (debug.enabled) {
		// Forward the `@ladjs/time-require` `--sorted` flag.
		// Intended for internal optimization tests only.
		if (opts._sorted) {
			process.argv.push('--sorted');
		}

		require('@ladjs/time-require'); // eslint-disable-line import/no-unassigned-import
	}
});

const sourceMapCache = new Map();

exports.installSourceMapSupport = mem(() => {
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
});

exports.installPrecompilerHook = mem(opts => {
	installPrecompiler(filename => {
		const precompiled = opts.precompiled[filename];

		if (precompiled) {
			sourceMapCache.set(filename, path.join(opts.cacheDir, `${precompiled}.js.map`));
			return fs.readFileSync(path.join(opts.cacheDir, `${precompiled}.js`), 'utf8');
		}

		return null;
	});
});

// TODO: Detect which dependencies belong to other test files in single mode
exports.installDependencyTracking = (dependencies, testPath) => {
	Object.keys(require.extensions).forEach(ext => {
		const wrappedHandler = require.extensions[ext];

		require.extensions[ext] = (module, filename) => {
			if (filename !== testPath) {
				dependencies.add(filename);
			}

			wrappedHandler(module, filename);
		};
	});
};
