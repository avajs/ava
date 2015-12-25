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
var chalk = require('chalk');
var Promise = require('bluebird');
var verboseReporter = require('./lib/reporters/verbose');
var tapReporter = require('./lib/reporters/tap');
var Logger = require('./lib/logger');
var Api = require('./api');

// Bluebird specific
Promise.longStackTraces();

var cli = meow([
	'Usage',
	'  ava [<file|folder|glob> ...]',
	'',
	'Options',
	'  --init       Add AVA to your project',
	'  --fail-fast  Stop after first test failure',
	'  --serial     Run tests serially',
	'  --no-cache   Disable the transpiler cache',
	'  --require    Module to preload (Can be repeated)',
	'  --tap        Generate TAP output',
	'',
	'Examples',
	'  ava',
	'  ava test.js test2.js',
	'  ava test-*.js',
	'  ava --init',
	'  ava --init foo.js',
	'',
	'Default patterns when no arguments:',
	'test.js test-*.js test/*.js'
], {
	string: [
		'_',
		'require'
	],
	boolean: [
		'fail-fast',
		'serial',
		'tap'
	]
});

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')();
	return;
}

var api = new Api(cli.input, {
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	require: arrify(cli.flags.require),
	cache: cli.flags.cache !== false
});

var logger = new Logger();
logger.api = api;

if (cli.flags.tap) {
	logger.use(tapReporter());
} else {
	logger.use(verboseReporter());
}

logger.start();

api.on('test', logger.test);
api.on('error', logger.unhandledError);

api.run()
	.then(function () {
		logger.finish();
		logger.exit(api.failCount > 0 || api.rejectionCount > 0 || api.exceptionCount > 0 ? 1 : 0);
	})
	.catch(function (err) {
		if (err instanceof Error) {
			console.log('  ' + chalk.red(figures.cross) + ' ' + err.message);
		} else {
			console.error(err.stack);
		}

		logger.exit(1);
	});
