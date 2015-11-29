#!/usr/bin/env node
'use strict';

var debug = require('debug')('ava');

// Prefer the local installation of AVA.
var resolveFrom = require('resolve-from');
var localCLI = resolveFrom('.', 'ava/cli');

if (localCLI && localCLI !== __filename) {
	debug('Using local install of AVA.');
	require(localCLI);
	return;
}

if (debug.enabled) {
	require('time-require');
}

var fs = require('fs');
var path = require('path');
var figures = require('figures');
var flatten = require('arr-flatten');
var globby = require('globby');
var meow = require('meow');
var updateNotifier = require('update-notifier');
var chalk = require('chalk');
var Promise = require('bluebird');
var fork = require('./lib/fork');
var log = require('./lib/logger');

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
	string: ['_'],
	boolean: [
		'fail-fast',
		'serial'
	]
});

var rejectionCount = 0;
var exceptionCount = 0;
var testCount = 0;
var fileCount = 0;
var errors = [];

function prefixTitle(file) {
	var separator = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

	var base = path.dirname(cli.input[0]);

	if (base === '.') {
		base = cli.input[0] || 'test';
	}

	base += path.sep;

	var prefix = path.relative('.', file)
		.replace(base, '')
		.replace(/\.spec/, '')
		.replace(/test\-/g, '')
		.replace(/\.js$/, '')
		.split(path.sep)
		.join(separator);

	if (prefix.length > 0) {
		prefix += separator;
	}

	return prefix;
}

function stats(stats) {
	testCount += stats.testCount;
}

function test(data) {
	var isError = data.error.message;

	if (fileCount > 1) {
		data.title = prefixTitle(data.file) + data.title;
	}

	if (isError) {
		log.error(data.title, chalk.red(data.error.message));

		errors.push(data);
	} else {
		// don't log it if there's only one file and one anonymous test
		if (fileCount === 1 && testCount === 1 && data.title === '[anonymous]') {
			return;
		}

		log.test(data);
	}
}

function run(file) {
	var args = [file];

	if (cli.flags.failFast) {
		args.push('--fail-fast');
	}

	if (cli.flags.serial) {
		args.push('--serial');
	}

	// Forward the `time-require` `--sorted` flag.
	// Intended for internal optimization tests only.
	if (cli.flags.sorted) {
		args.push('--sorted');
	}

	return fork(args)
		.on('stats', stats)
		.on('test', test)
		.on('unhandledRejections', handleRejections)
		.on('uncaughtException', handleExceptions);
}

function handleRejections(data) {
	log.unhandledRejections(data.file, data.rejections);
	rejectionCount += data.rejections.length;
}

function handleExceptions(data) {
	log.uncaughtException(data.file, data.exception);
	exceptionCount++;
}

function sum(arr, key) {
	var result = 0;

	arr.forEach(function (item) {
		result += item[key];
	});

	return result;
}

function exit(results) {
	// assemble stats from all tests
	var stats = results.map(function (result) {
		return result.stats;
	});

	var tests = results.map(function (result) {
		return result.tests;
	});

	var passed = sum(stats, 'passCount');
	var failed = sum(stats, 'failCount');

	log.write();
	log.report(passed, failed, rejectionCount, exceptionCount);
	log.write();

	if (failed > 0) {
		log.errors(flatten(tests));
	}

	process.stdout.write('');

	flushIoAndExit(failed > 0 || rejectionCount > 0 || exceptionCount > 0 ? 1 : 0);
}

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

function init(files) {
	log.write();

	return handlePaths(files)
		.map(function (file) {
			return path.resolve(file);
		})
		.then(function (files) {
			if (files.length === 0) {
				log.error('Couldn\'t find any files to test\n');
				process.exit(1);
			}

			fileCount = files.length;

			return cli.flags.serial ? Promise.mapSeries(files, run)
				: Promise.all(files.map(run));
		});
}

function handlePaths(files) {
	if (files.length === 0) {
		files = [
			'test.js',
			'test-*.js',
			'test/*.js'
		];
	}

	files.push('!**/node_modules/**');

	// convert pinkie-promise to Bluebird promise
	files = Promise.resolve(globby(files));

	return files
		.map(function (file) {
			if (fs.statSync(file).isDirectory()) {
				return handlePaths([path.join(file, '*.js')]);
			}

			return file;
		})
		.then(flatten)
		.filter(function (file) {
			return path.extname(file) === '.js' && path.basename(file)[0] !== '_';
		});
}

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')();
} else {
	init(cli.input).then(exit).catch(function (err) {
		console.error(err.stack);
		flushIoAndExit(1);
	});
}
