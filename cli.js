#!/usr/bin/env node
'use strict';

var debug = require('debug')('ava');

// Prefer the local installation of AVA.
var resolveCwd = require('resolve-cwd');
var localCLI = resolveCwd('ava/cli');

if (localCLI && localCLI !== __filename) {
	debug('Using local install of AVA.');
	require(localCLI);
	return;
}

if (debug.enabled) {
	require('time-require');
}

var updateNotifier = require('update-notifier');
var figures = require('figures');
var arrify = require('arrify');
var meow = require('meow');
var Promise = require('bluebird');
var pkgConf = require('pkg-conf');
var colors = require('./lib/colors');
var verboseReporter = require('./lib/reporters/verbose');
var miniReporter = require('./lib/reporters/mini');
var tapReporter = require('./lib/reporters/tap');
var Logger = require('./lib/logger');
var Api = require('./api');

// Bluebird specific
Promise.longStackTraces();

var conf = pkgConf.sync('ava');

var cli = meow([
	'Usage',
	'  ava [<file|folder|glob> ...]',
	'',
	'Options',
	'  --init       Add AVA to your project',
	'  --fail-fast  Stop after first test failure',
	'  --serial     Run tests serially',
	'  --require    Module to preload (Can be repeated)',
	'  --tap        Generate TAP output',
	'  --verbose    Enable verbose output',
	'  --no-cache   Disable the transpiler cache',
	'',
	'Examples',
	'  ava',
	'  ava test.js test2.js',
	'  ava test-*.js',
	'  ava test',
	'  ava --init',
	'  ava --init foo.js',
	'',
	'Default patterns when no arguments:',
	'test.js test-*.js test/**/*.js'
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
	default: conf
});

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')();
	return;
}

var api = new Api(cli.input.length ? cli.input : arrify(conf.files), {
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	require: arrify(cli.flags.require),
	cacheEnabled: cli.flags.cache !== false
});

var logger = new Logger();
logger.api = api;

logger.use(miniReporter());

if (cli.flags.tap) {
	logger.use(tapReporter());
}

if (cli.flags.verbose) {
	logger.use(verboseReporter());
}

logger.start();

api.on('test', logger.test);
api.on('error', logger.unhandledError);

api.on('stdout', logger.stdout);
api.on('stderr', logger.stderr);

api.run()
	.then(function () {
		logger.finish();
		logger.exit(api.failCount > 0 || api.rejectionCount > 0 || api.exceptionCount > 0 ? 1 : 0);
	})
	.catch(function (err) {
		if (err.name === 'AvaError') {
			console.log('  ' + colors.error(figures.cross) + ' ' + err.message);
		} else {
			console.error(colors.stack(err.stack));
		}

		logger.exit(1);
	});
