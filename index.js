'use strict';
var path = require('path');
var chalk = require('chalk');
var serializeError = require('serialize-error');
var globals = require('./lib/globals');
var Runner = require('./lib/runner');
var send = require('./lib/send');
var log = require('./lib/logger');

// note that test files have require('ava')
require('./lib/test-worker').avaRequired = true;

var opts = JSON.parse(process.argv[2]);
var runner = new Runner(opts);

// check if the test is being run without AVA cli
var isForked = typeof process.send === 'function';

if (!isForked) {
	var fp = path.relative('.', process.argv[1]);

	log.write();
	log.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + fp) + '\n');

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

	var hasError = typeof props.error !== 'undefined';

	// don't display anything if it's a passed hook
	if (!hasError && props.type !== 'test') {
		return;
	}

	props.error = hasError ? serializeError(props.error) : {};

	send('test', props);

	if (hasError && opts.failFast) {
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

globals.setImmediate(function () {
	var numberOfTests = runner.select({type: 'test', skipped: false}).length;

	if (numberOfTests === 0) {
		send('no-tests', {avaRequired: true});
		return;
	}

	send('stats', {
		testCount: numberOfTests
	});

	runner.on('test', test);

	process.on('ava-run', function () {
		runner.run().then(exit);
	});
});

module.exports = runner.test;
