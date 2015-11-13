#!/usr/bin/env node
'use strict';
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

var cli = meow({
	help: [
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
	]
}, {
	string: ['_'],
	boolean: [
		'fail-fast',
		'serial'
	]
});

var testCount = 0;
var fileCount = 0;
var errors = [];

function error(err) {
	console.error(err.stack);
	process.exit(1);
}

function prefixTitle(file) {
	var separator = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

	var base = path.dirname(cli.input[0]);

	if (base === '.') {
		base = cli.input[0] || 'test';
	}

	base += path.sep;

	var prefix = path.relative(process.cwd(), file)
		.replace(/test\-/g, '')
		.replace(/\.js$/, '')
		.replace(base, '')
		.split(path.sep).join(separator);

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
		// if there's only one file and one anonymous test
		// don't log it
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

	return fork(args)
		.on('stats', stats)
		.on('test', test)
		.on('data', function (data) {
			process.stdout.write(data);
		});
}

function sum(arr, key) {
	var result = 0;

	arr.forEach(function (item) {
		result += item[key];
	});

	return result;
}

function exit(results) {
	// in case of non-test files, the result will be undefined so we remove them
	results = results.filter(function (result) {
		return result !== undefined;
	});
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
	log.report(passed, failed);
	log.write();

	if (failed > 0) {
		log.errors(flatten(tests));
	}

	// TODO: figure out why this needs to be here to
	// correctly flush the output when multiple test files
	process.stdout.write('');

	// timeout required to correctly flush stderr on Node 0.10 Windows
	setTimeout(function () {
		process.exit(failed > 0 ? 1 : 0);
	}, 0);
}

function init(files) {
	log.write();

	return handlePaths(files)
		.map(function (file) {
			return path.resolve('.', file);
		})
		.then(function (files) {
			if (files.length === 0) {
				log.error('Couldn\'t find any files to test\n');
				process.exit(1);
			}

			fileCount = files.length;

			var tests = files.map(run);

			return Promise.all(tests);
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
	require('ava-init')().catch(error);
} else {
	init(cli.input).then(exit).catch(error);
}
