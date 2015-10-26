'use strict';
var setImmediate = require('set-immediate-shim');
var hasFlag = require('has-flag');
var Runner = require('./lib/runner');
var runner = new Runner();

// if fail-fast is enabled, use this variable to detect,
// that no more tests should be logged
var isFailed = false;

Error.stackTraceLimit = Infinity;

function serializeError(err) {
	err = {
		message: err.message,
		stack: err.stack
	};

	return err;
}

function test(err, title, duration) {
	if (isFailed) {
		return;
	}

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

	if (err && hasFlag('fail-fast')) {
		isFailed = true;
		exit();
	}
}

function exit() {
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
}

setImmediate(function () {
	runner.on('test', test);
	runner.run().then(exit);
});

module.exports = runner.addTest.bind(runner);
module.exports.serial = runner.addSerialTest.bind(runner);
module.exports.before = runner.addBeforeHook.bind(runner);
module.exports.after = runner.addAfterHook.bind(runner);
module.exports.beforeEach = runner.addBeforeEachHook.bind(runner);
module.exports.afterEach = runner.addAfterEachHook.bind(runner);
