'use strict';
var setImmediate = require('set-immediate-shim');
var hasFlag = require('has-flag');
var chalk = require('chalk');
var relative = require('path').relative;
var serializeError = require('serialize-error');
var Runner = require('./lib/runner');
var log = require('./lib/logger');
var runner = new Runner();

// check if the test is being run without AVA cli
var isForked = typeof process.send === 'function';

if (!isForked) {
	var path = relative('.', process.argv[1]);

	log.write();
	log.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + path) + '\n');

	process.exit(1);
}

// if fail-fast is enabled, use this variable to detect,
// that no more tests should be logged
var isFailed = false;

Error.stackTraceLimit = Infinity;

function test(props) {
	if (isFailed) {
		return;
	}

	// don't display anything, if it's a passed hook
	if (!props.error && props.type !== 'test') {
		return;
	}

	props.error = props.error ? serializeError(props.error) : {};

	process.send({
		name: 'test',
		data: props
	});

	if (props.error && hasFlag('fail-fast')) {
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
module.exports.skip = runner.addSkippedTest.bind(runner);
