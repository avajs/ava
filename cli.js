#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var globby = require('globby');
var meow = require('meow');
var updateNotifier = require('update-notifier');

var cli = meow({
	help: [
		'Usage',
		'  ava <file|folder|glob> [...]',
		'',
		'Example',
		'  ava test.js test2.js',
		'  ava test',
		'  ava test-*.js'
	].join('\n')
}, {
	string: ['_']
});

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

		require(file);
	});
}

function init(files) {
	globby(files, function (err, files) {
		if (err) {
			console.error(err.message);
			process.exit(1);
		}

		files.forEach(function (file) {
			run(path.resolve(process.cwd(), file));
		});
	});
}

updateNotifier({
	packageName: cli.pkg.name,
	packageVersion: cli.pkg.version
}).notify();

if (cli.input.length === 0) {
	console.error('Input required');
	process.exit(1);
}

init(cli.input);
