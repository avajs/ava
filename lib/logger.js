'use strict';

var prettyMs = require('pretty-ms');
var figures = require('figures');
var Squeak = require('squeak');
var chalk = require('chalk');
var log = new Squeak({separator: ' '});
var x = module.exports;

x.write = log.write.bind(log);
x.writelpad = log.writelpad.bind(log);

function beautifyStack(stack) {
	var re = /(?:^(?! {4}at\b).{6})|(?:\((?:[\\\/](?:(?!node_modules[\\\/]ava[\\\/])[^:\\\/])+)+:\d+:\d+\))/;
	var found = false;

	return stack.split('\n').filter(function (line) {
		var relevant = re.test(line);
		found = found || relevant;
		return !found || relevant;
	}).join('\n');
}

log.type('success', {
	color: 'green',
	prefix: figures.tick
});

log.type('error', {
	color: 'red',
	prefix: figures.cross
});

x.test = function (err, title, duration) {
	if (err) {
		log.error(title, chalk.red(err.message));
		return;
	}

	// if (runner.stats.testCount === 1) {
	// 	return;
	// }

	// display duration only over a threshold
	var threshold = 100;
	var dur = duration > threshold ? chalk.gray.dim(' (' + prettyMs(duration) + ')') : '';
	log.success(title + dur);
};

x.stack = function (stack) {
	log.writelpad(chalk.red(beautifyStack(stack)));
};

