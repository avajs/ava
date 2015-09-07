'use strict';
var setImmediate = require('set-immediate-shim');
var prettyMs = require('pretty-ms');
var chalk = require('chalk');
var figures = require('figures');
var Squeak = require('squeak');
var plur = require('plur');
var Runner = require('./lib/runner');
var log = new Squeak({separator: ' '});
var runner = new Runner();

Error.stackTraceLimit = Infinity;

log.type('success', {
	color: 'green',
	prefix: figures.tick
});

log.type('error', {
	color: 'red',
	prefix: figures.cross
});

function test(err, title, duration) {
	if (err) {
		log.error(title, chalk.red(err.message));
		return;
	}

	// display duration only over a threshold
	var threshold = 100;
	var dur = duration > threshold ? chalk.gray.dim(' (' + prettyMs(duration) + ')') : '';

	log.success(title + dur);
}

function stack(results) {
	var i = 0;

	results.forEach(function (result) {
		if (!result.error) {
			return;
		}

		i++;

		// Don't print the full stack but the only useful line showing
		// the actual test file stack
		var reg = /(?:^(?! {4}at\b).{6})|(?:\((?:[\\\/](?:(?!node_modules[\\\/]ava[\\\/])[^:\\\/])+)+:\d+:\d+\))/;
		function beautifulStack(stack) {
			var found = false;
			return stack.split('\n').filter(function (line) {
				var relevant = reg.test(line);
				found = found || relevant;
				return !found || relevant;
			}).join('\n');
		}
		var stack = beautifulStack(result.error.stack);

		log.writelpad(chalk.red(i + '.', result.title));
		log.writelpad(chalk.red(stack));
		log.write();
	});
}

function exit(stats, results) {
	if (stats.testCount > 0) {
		log.write();
	}

	if (stats.failCount === 0) {
		log.writelpad(chalk.green(stats.passCount, plur('test', stats.passCount), 'passed'));
	} else {
		log.writelpad(chalk.red(stats.failCount, plur('test', stats.failCount), 'failed'));
	}

	log.write();

	if (stats.failCount > 0) {
		stack(results);
	}

	process.exit(stats.failCount > 0 ? 1 : 0);
}

setImmediate(function () {
	runner.on('test', test);
	runner.run(exit);
});

module.exports = runner.addTest.bind(runner);
module.exports.serial = runner.addSerialTest.bind(runner);
module.exports.before = runner.addBeforeHook.bind(runner);
module.exports.after = runner.addAfterHook.bind(runner);
