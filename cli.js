#!/usr/bin/env node
'use strict';
var updateNotifier = require('update-notifier');
var meow = require('meow');
var ava = require('./');

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

console.error('not implemented');
process.exit(1);
