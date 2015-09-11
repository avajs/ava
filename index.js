'use strict';
var setImmediate = require('set-immediate-shim');
var chalk = require('chalk');
var Runner = require('./lib/runner');
var runner = new Runner();
var log = require('./lib/logger');

var isForked = process.env.AVA_FORK;

Error.stackTraceLimit = Infinity;

function stack(results) {
	var i = 0;

	results.forEach(function (result) {
		if (!result.error) {
			return;
		}

		i++;

		log.writelpad(chalk.red(i + '.', result.title));
		log.stack(result.error.stack);
		log.write();
	});
}

function test(err, title, duration) {
	if (isForked) {
		// serialize Error object
		if (err) {
			err = {
				message: err.message,
				stack: err.stack
			};
		}

		process.send({
			err: err || {},
			title: title,
			duration: duration
		});

		return;
	}

	log.test(err, title, duration);
}

function exit() {
	if (isForked) {
		return;
	}

	var stats = runner.stats;
	var results = runner.results;

	log.write();
	log.report(stats.passCount, stats.failCount);
	log.write();

	if (stats.failCount > 0) {
		stack(results);
	}

	process.exit(stats.failCount > 0 ? 1 : 0);
}

setImmediate(function () {
	log.write();
	runner.on('test', test);
	runner.run().then(exit);
});

module.exports = runner.addTest.bind(runner);
module.exports.serial = runner.addSerialTest.bind(runner);
module.exports.before = runner.addBeforeHook.bind(runner);
module.exports.after = runner.addAfterHook.bind(runner);
