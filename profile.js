'use strict';

// Iron-node does not work with forked processes
// This cli command will run a single file in the current process.
// Intended to be used with iron-node for profiling purposes.

const path = require('path');
const EventEmitter = require('events');
const meow = require('meow');
const Promise = require('bluebird');
const pkgConf = require('pkg-conf');
const findCacheDir = require('find-cache-dir');
const uniqueTempDir = require('unique-temp-dir');
const arrify = require('arrify');
const resolveCwd = require('resolve-cwd');
const CachingPrecompiler = require('./lib/caching-precompiler');
const globals = require('./lib/globals');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd(name);

		if (modulePath === null) {
			throw new Error(`Could not resolve required module '${name}'`);
		}

		return modulePath;
	});
}

// Chrome gets upset when the `this` value is non-null for these functions
globals.setTimeout = setTimeout.bind(null);
globals.clearTimeout = clearTimeout.bind(null);

Promise.longStackTraces();

const conf = pkgConf.sync('ava', {
	defaults: {
		babel: 'default'
	}
});

// Define a minimal set of options from the main CLI
const cli = meow(`
	Usage
	  $ iron-node node_modules/ava/profile.js <test-file>

	Options
	  --fail-fast   Stop after first test failure
	  --serial, -s  Run tests serially

`, {
	string: [
		'_'
	],
	boolean: [
		'fail-fast',
		'verbose',
		'serial',
		'tap'
	],
	default: conf,
	alias: {
		s: 'serial'
	}
});

if (cli.input.length !== 1) {
	throw new Error('Specify a test file');
}

const file = path.resolve(cli.input[0]);
const cacheDir = findCacheDir({
	name: 'ava',
	files: [file]
}) || uniqueTempDir();

const precompiler = new CachingPrecompiler({
	path: cacheDir,
	babel: conf.babel
});

const precompiled = {};
precompiled[file] = precompiler.precompileFile(file);

const opts = {
	file,
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	tty: false,
	cacheDir,
	precompiled,
	require: resolveModules(conf.require)
};

const events = new EventEmitter();
let uncaughtExceptionCount = 0;

// Mock the behavior of a parent process
process.send = data => {
	if (data && data.ava) {
		const name = data.name.replace(/^ava-/, '');

		if (events.listeners(name).length > 0) {
			events.emit(name, data.data);
		} else {
			console.log('UNHANDLED AVA EVENT:', name, data.data);
		}

		return;
	}

	console.log('NON AVA EVENT:', data);
};

events.on('test', data => {
	console.log('TEST:', data.title, data.error);
});

events.on('results', data => {
	if (console.profileEnd) {
		console.profileEnd();
	}

	console.log('RESULTS:', data.stats);

	if (process.exit) {
		process.exit(data.stats.failCount + uncaughtExceptionCount); // eslint-disable-line unicorn/no-process-exit
	}
});

events.on('stats', () => {
	setImmediate(() => {
		process.emit('ava-run', {});
	});
});

events.on('uncaughtException', data => {
	uncaughtExceptionCount++;
	let stack = data && data.exception && data.exception.stack;
	stack = stack || data;
	console.log(stack);
});

// `test-worker` will read process.argv[2] for options
process.argv[2] = JSON.stringify(opts);
process.argv.length = 3;

if (console.profile) {
	console.profile('AVA test-worker process');
}

setImmediate(() => {
	require('./lib/test-worker'); // eslint-disable-line import/no-unassigned-import
});
