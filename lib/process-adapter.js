'use strict';
const fs = require('fs');
const path = require('path');
const debug = require('debug')('ava');
const sourceMapSupport = require('source-map-support');
const installPrecompiler = require('require-precompiled');

// Parse and re-emit AVA messages
process.on('message', message => {
	if (!message.ava) {
		return;
	}

	process.emit(message.name, message.data);
});

exports.send = (name, data) => {
	process.send({
		name: `ava-${name}`,
		data,
		ava: true
	});
};

// `process.channel` was added in Node.js 7.1.0, but the channel was available
// through an undocumented API as `process._channel`.
exports.ipcChannel = process.channel || process._channel;

const opts = JSON.parse(process.argv[2]);
exports.opts = opts;

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
	// Forward the `@ladjs/time-require` `--sorted` flag.
	// Intended for internal optimization tests only.
	if (opts._sorted) {
		process.argv.push('--sorted');
	}

	require('@ladjs/time-require'); // eslint-disable-line import/no-unassigned-import
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
				dependencies.add(filename);
			}

			wrappedHandler(module, filename);
		};
	});
};
