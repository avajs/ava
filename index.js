'use strict';
var setImmediate = require('set-immediate-shim');
var Runner = require('./lib/runner');
var runner = new Runner();
var log = require('./lib/logger');

var isForked = process.env.AVA_FORK;

Error.stackTraceLimit = Infinity;

function serializeError(err) {
	err = {
		message: err.message,
		stack: err.stack
	};

	return err;
}

function test(err, title, duration) {
	if (isForked) {
		if (err) {
			err = serializeError(err);
		}

		process.send({
			name: 'test',
			data: {
				err: err || {},
				title: title,
				duration: duration
			}
		});

		return;
	}

	log.test(err, title, duration);
}

function exit() {
	if (isForked) {
		// serialize errors
		runner.results.forEach(function (result) {
			if (result.error) {
				result.error = serializeError(result.error);
			}
		});

		process.send({
			name: 'results',
			data: {
				stats: runner.stats,
				tests: runner.results
			}
		});

		return;
	}

	var stats = runner.stats;
	var results = runner.results;

	log.write();
	log.report(stats.passCount, stats.failCount);
	log.write();

	if (stats.failCount > 0) {
		log.errors(results);
	}

	process.exit(stats.failCount > 0 ? 1 : 0);
}

setImmediate(function () {
	if (!isForked) {
		log.write();
	}

	runner.on('test', test);
	runner.run().then(exit);
});

module.exports = runner.addTest.bind(runner);
module.exports.serial = runner.addSerialTest.bind(runner);
module.exports.before = runner.addBeforeHook.bind(runner);
module.exports.after = runner.addAfterHook.bind(runner);
