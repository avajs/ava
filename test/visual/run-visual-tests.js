'use strict';
require('loud-rejection'); // eslint-disable-line import/no-unassigned-import
var path = require('path');
var childProcess = require('child_process');
var chalk = require('chalk');
var arrify = require('arrify');
var Promise = require('bluebird');
var pify = require('pify');
var inquirer = pify(require('inquirer'), Promise);

var cwd = path.resolve(__dirname, '../../');

function fixture(fixtureName) {
	if (!path.extname(fixtureName)) {
		fixtureName += '.js';
	}
	return path.join(__dirname, fixtureName);
}

function exec(args) {
	childProcess.spawnSync(process.execPath, ['./cli.js'].concat(arrify(args)), {
		cwd: cwd,
		stdio: 'inherit'
	});
}

function run(name, args, message, question) {
	return new Promise(function (resolve, reject) {
		console.log(chalk.cyan('**BEGIN ' + name + '**'));
		exec(args);
		console.log(chalk.cyan('**END ' + name + '**\n'));
		console.log(arrify(message).join('\n') + '\n');
		inquirer.prompt(
			[{
				type: 'confirm',
				name: 'confirmed',
				message: question || 'Does it appear correctly',
				default: false
			}],
			function (data) {
				if (!data.confirmed) {
					reject(new Error(arrify(args).join(' ') + ' failed'));
				}
				resolve();
			}
		);
	});
}

// thunked version of run for promise handlers
function thenRun() {
	var args = Array.prototype.slice.call(arguments);
	return function () {
		return run.apply(null, args);
	};
}

run(
	'console.log() should not mess up mini reporter',
	fixture('console-log'),
	[
		'The output should have four logged lines in the following order (no empty lines in between): ',
		'',
		'  foo',
		'  bar',
		'  baz',
		'  quz',
		'',
		'The mini reporter output (2 passes) should only appear at the end.'
	])

	.then(thenRun(
		'stdout.write() should not mess up the mini reporter',
		fixture('stdout-write'),
		[
			'The output should have a single logged line: ',
			'',
			'  foo bar baz quz',
			'',
			'The mini reporter output (3 passed) should only appear at the end'
		]
	))

	.then(thenRun(
		'stdout.write() of lines that are exactly the same width as the terminal',
		fixture('text-ends-at-terminal-width'),
		[
			'The fixture runs twelve tests, each logging about half a line of text.',
			'The end result should be six lines of numbers, with no empty lines in between.',
			'Each line should fill the terminal completely left to right.',
			'',
			'The mini reporter output (12 passed) should appear at the end.'
		]
	))

	.then(thenRun(
		'complex output',
		fixture('lorem-ipsum'),
		[
			'You should see the entire contents of the Gettysburg address.',
			'Three paragraphs with a blank line in between each.',
			'There should be no other blank lines within the speech text.',
			'The test counter should display "399 passed  1 failed" at the bottom.'
		]
	))
;
