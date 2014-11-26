#!/usr/bin/env node
'use strict';
var path = require('path');
var globby = require('globby');
var meow = require('meow');
var updateNotifier = require('update-notifier');

var cli = meow({
	help: [
		'Usage',
		'  ava <file> [<file> ...]',
		'',
		'Example',
		'  ava test.js test2.js'
	].join('\n')
}, {
	string: ['_']
});

updateNotifier({
	packageName: cli.pkg.name,
	packageVersion: cli.pkg.version
}).notify();

if (cli.input.length === 0) {
	console.error('Input required');
	process.exit(1);
}

globby(cli.input, function (err, files) {
	if (err) {
		console.error(err.message);
		process.exit(1);
	}

	files.forEach(function (file) {
		require(path.resolve(process.cwd(), file));
	});
});
