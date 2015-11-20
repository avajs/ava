'use strict';
var setImmediate = require('set-immediate-shim');
var relative = require('path').relative;
var hasFlag = require('has-flag');
var chalk = require('chalk');
var serializeError = require('./lib/serialize-value');
var Runner = require('./lib/runner');
var send = require('./lib/send');
var log = require('./lib/logger');

var runner = new Runner();

// note that test files have require('ava')
require('./lib/babel').avaRequired = true;

// check if the test is being run without AVA cli
var isForked = typeof process.send === 'function';

if (!isForked) {
	var path = relative('.', process.argv[1]);

	log.write();
	log.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + path) + '\n');

	process.exit(1);
}

// if fail-fast is enabled, use this variable to detect
// that no more tests should be logged
var isFailed = false;

Error.stackTraceLimit = Infinity;

function test(props) {
	if (isFailed) {
		return;
	}

	// don't display anything if it's a passed hook
	if (!props.error && props.type !== 'test') {
		return;
	}

	props.error = props.error ? serializeError(props.error) : {};

	send('test', props);

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

	send('results', {
		stats: runner.stats,
		tests: runner.results
	});
}

setImmediate(function () {
	runner.on('test', test);
	runner.run().then(exit);
});

module.exports = runner.chain();
