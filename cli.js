#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var flatten = require('arr-flatten');
var globby = require('globby');
var meow = require('meow');
var updateNotifier = require('update-notifier');
var chalk = require('chalk');
var fork = require('./lib/fork');
var log = require('./lib/logger');
var Promise = require('bluebird');

var cli = meow({
	help: [
		'Usage',
		'  ava <file|folder|glob> [...]',
		'',
		'Options',
		'  --init  Add AVA to your project',
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
	string: ['_']
});

var errors = [];
var failed = 0;
var passed = 0;

function error(err) {
	console.error(err.stack);
	process.exit(1);
}

function test(data) {
	var isError = data.err.message;

	if (isError) {
		log.error(data.title, chalk.red(data.err.message));

		errors.push(data);
		failed++;
	} else {
		log.test(null, data.title, data.duration);

		passed++;
	}
}

function run(file) {
	return fork(file)
		.on('message', test)
		.on('data', function (data) {
			process.stdout.write(data);
		});
}

function exit() {
	log.write();
	log.report(passed, failed);
	log.write();

	var i = 0;

	errors.forEach(function (test) {
		i++;

		log.writelpad(chalk.red(i + '.', test.title));
		log.stack(test.err.stack);
		log.write();
	});

	// TODO: figure out why this needs to be here to
	// correctly flush the output when multiple test files
	process.stdout.write('');

	process.exit(failed > 0 ? 1 : 0);
}

function init(files) {
	log.write();

	return handlePaths(files)
		.map(function (file) {
			return path.join(process.cwd(), file);
		})
		.then(function (files) {
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
			var stats = fs.statSync(path.join(process.cwd(), file));

			if (stats.isDirectory()) {
				return handlePaths([path.join(file, '*.js')]);
			}

			return file;
		})
		.then(function (files) {
			return flatten(files);
		})
		.filter(function (file) {
			return path.extname(file) === '.js';
		});
}

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')().catch(error);
} else {
	init(cli.input).then(exit).catch(error);
}
