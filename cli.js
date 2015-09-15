#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var globby = require('globby');
var meow = require('meow');
var updateNotifier = require('update-notifier');
var assign = require('object-assign');
var chalk = require('chalk');
var fork = require('child_process').fork;
var join = require('path').join;
var log = require('./lib/logger');

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
	var stats = fs.statSync(file);

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

	var babel = join(__dirname, 'lib', 'babel.js');

	var ps = fork(babel, [file], options);

	ps.on('message', test);
	ps.on('close', exit);
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

	process.exit(failed > 0 ? 1 : 0);
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
