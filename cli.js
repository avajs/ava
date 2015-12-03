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

var arrify = require('arrify');
var meow = require('meow');
var updateNotifier = require('update-notifier');
var chalk = require('chalk');
var Promise = require('bluebird');
var log = require('./lib/logger');
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
	'  --require    Module to preload (Can be repeated)',
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
		'serial'
	]
});

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')();
	return;
}

log.write();

var api = new Api(cli.input, {
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	require: arrify(cli.flags.require)
});

api.on('test', function (test) {
	if (test.error) {
		log.error(test.title, chalk.red(test.error.message));
	} else {
		// don't log it if there's only one file and one anonymous test
		if (api.fileCount === 1 && api.testCount === 1 && test.title === '[anonymous]') {
			return;
		}

		log.test(test);
	}
});

api.on('error', function (data) {
	log.unhandledError(data.type, data.file, data);
});

api.run()
	.then(function () {
		log.write();
		log.report(api.passCount, api.failCount, api.rejectionCount, api.exceptionCount);
		log.write();

		if (api.failCount > 0) {
			log.errors(api.errors);
		}

		process.stdout.write('');
		flushIoAndExit(api.failCount > 0 || api.rejectionCount > 0 || api.exceptionCount > 0 ? 1 : 0);
	})
	.catch(function (err) {
		log.error(err.message);
		flushIoAndExit(1);
	});

function flushIoAndExit(code) {
	// TODO: figure out why this needs to be here to
	// correctly flush the output when multiple test files
	process.stdout.write('');
	process.stderr.write('');

	// timeout required to correctly flush IO on Node.js 0.10 on Windows
	setTimeout(function () {
		process.exit(code);
	}, process.env.AVA_APPVEYOR ? 500 : 0);
}
