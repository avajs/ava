'use strict';
var prettyMs = require('pretty-ms');
var figures = require('figures');
var Squeak = require('squeak');
var chalk = require('chalk');
var plur = require('plur');
var log = new Squeak({separator: ' '});
var x = module.exports;

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

x.write = log.write.bind(log);
x.writelpad = log.writelpad.bind(log);
x.success = log.success.bind(log);
x.error = log.error.bind(log);

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

x.errors = function (results) {
	var i = 0;

	results.forEach(function (result) {
		if (!result.error) {
			return;
		}

		i++;

		log.writelpad(chalk.red(i + '.', result.title));
		log.writelpad(chalk.red(beautifyStack(result.error.stack)));
		log.write();
	});
};

x.report = function (passed, failed) {
	if (failed > 0) {
		log.writelpad(chalk.red(failed, plur('test', failed), 'failed'));
	} else {
		log.writelpad(chalk.green(passed, plur('test', passed), 'passed'));
	}
};
