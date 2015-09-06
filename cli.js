#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var globby = require('globby');
var meow = require('meow');
var resolveFrom = require('resolve-from');
var updateNotifier = require('update-notifier');

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

function error(err) {
	console.error(err.stack);
	process.exit(1);
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

		require(file);
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
	return;
}

init(cli.input).catch(error);
