'use strict';

// iron-node does not work with forked processes
// This cli command will run a single file in the current process.
// Intended to be used with iron-node for profiling purposes.

var path = require('path');
var EventEmitter = require('events').EventEmitter;
var meow = require('meow');
var Promise = require('bluebird');
var pkgConf = require('pkg-conf');
var arrify = require('arrify');
var findCacheDir = require('find-cache-dir');
var uniqueTempDir = require('unique-temp-dir');
var CachingPrecompiler = require('./lib/caching-precompiler');
var globals = require('./lib/globals');

// Chrome gets upset when the `this` value is non-null for these functions.
globals.setTimeout = setTimeout.bind(null);
globals.clearTimeout = clearTimeout.bind(null);

Promise.longStackTraces();
var conf = pkgConf.sync('ava', {
	defaults: {
		babel: 'default'
	}
});

// Define a minimal set of options from the main CLI.
var cli = meow([
	'Usage',
	'  $ iron-node node_modules/ava/profile.js <test-file>',
	'',
	'Options',
	'  --fail-fast    Stop after first test failure',
	'  --serial, -s   Run tests serially',
	'  --require, -r  Module to preload (Can be repeated)',
	''
], {
	string: [
		'_',
		'require'
	],
	boolean: [
		'fail-fast',
		'verbose',
		'serial',
		'tap'
	],
	default: conf,
	alias: {
		r: 'require',
		s: 'serial'
	}
});

if (cli.input.length !== 1) {
	throw new Error('Specify a test file');
}

var file = path.resolve(cli.input[0]);
var cacheDir = findCacheDir({name: 'ava', files: [file]}) || uniqueTempDir();
var opts = {
	file: file,
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	require: arrify(cli.flags.require),
	tty: false,
	cacheDir: cacheDir,
	precompiled: new CachingPrecompiler(cacheDir, conf.babel).generateHashForFile(file)
};

var events = new EventEmitter();

// Mock the behavior of a parent process.
process.send = function (data) {
	if (data && data.ava) {
		var name = data.name.replace(/^ava-/, '');

		if (events.listenerCount(name)) {
			events.emit(name, data.data);
		} else {
			console.log('UNHANDLED AVA EVENT:', name, data.data);
		}

		return;
	}

	console.log('NON AVA EVENT:', data);
};

events.on('test', function (data) {
	console.log('TEST:', data.title, data.error);
});

events.on('results', function (data) {
	console.profileEnd();
	console.log('RESULTS:', data.stats);
});

events.on('stats', function () {
	setImmediate(function () {
		process.emit('ava-run');
	});
});

// test-worker will read process.argv[2] for options
process.argv[2] = JSON.stringify(opts);
process.argv.length = 3;

console.profile('AVA test-worker process');

setImmediate(function () {
	require('./lib/test-worker');
});
