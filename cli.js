#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var globby = require('globby');
var meow = require('meow');
var resolveFrom = require('resolve-from');
var updateNotifier = require('update-notifier');
var assign = require('object-assign');
var chalk = require('chalk');
var fork = require('child_process').fork;
var log = require('./lib/logger');

try {
	require(resolveFrom('.', 'babel-core/register') || resolveFrom('.', 'babel/register'));
} catch (err) {
	require('babel-core/register');
}

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
var files = 0;

function error(err) {
	console.error(err.stack);
	process.exit(1);
}

function test(data) {
	if (data.toString().trim().length === 0) {
		return;
	}

	var test = JSON.parse(data);
	var isError = test.err.message;

	if (isError) {
		log.error(test.title, chalk.red(test.err.message));

		errors.push(test);
		failed++;
	} else {
		log.test(null, test.title, test.duration);

		passed++;
	}
}

function run(file) {
	fs.stat(file, function (err, stats) {
		if (err) {
			console.error(err.message);
			process.exit(1);
		}

		if (stats.isDirectory()) {
			init(path.join(file, '*.js'));
			return;
		}

		if (path.extname(file) !== '.js') {
			return;
		}

		var options = {
			env: assign({}, process.env, {AVA_FORK: 1}),
			silent: true
		};

		files++;

		var ps = fork(file, options);

		ps.stdout.on('data', test);
		ps.stderr.on('data', test);
		ps.on('close', exit);
	});
}

function exit() {
	if (--files > 0) {
		return;
	}

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
}

function init(files) {
	if (files.length === 0) {
		files = [
			'test.js',
			'test-*.js',
			'test/*.js'
		];
	}

	return globby(files).then(function (files) {
		files.forEach(function (file) {
			run(path.resolve(file));
		});

		// TODO: figure out why this needs to be here to
		// correctly flush the output when multiple test files
		process.stdout.write('');
	});
}

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')().catch(error);
} else {
	init(cli.input).catch(error);
}
