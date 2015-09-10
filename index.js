'use strict';
var setImmediate = require('set-immediate-shim');
var chalk = require('chalk');
var plur = require('plur');
var Runner = require('./lib/runner');
var runner = new Runner();
var log = require('./lib/logger');

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

function exit() {
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
	runner.on('test', log.test);
	runner.run().then(exit);
});

module.exports = runner.addTest.bind(runner);
module.exports.serial = runner.addSerialTest.bind(runner);
module.exports.before = runner.addBeforeHook.bind(runner);
module.exports.after = runner.addAfterHook.bind(runner);
