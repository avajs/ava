'use strict';
var path = require('path');
var chalk = require('chalk');
var serializeError = require('./lib/serialize-error');
var globals = require('./lib/globals');
var Runner = require('./lib/runner');
var send = require('./lib/send');

var opts = globals.options;
var runner = new Runner({
	serial: opts.serial,
	bail: opts.failFast,
	match: opts.match
});

// note that test files have require('ava')
require('./lib/test-worker').avaRequired = true;

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

	if (hasError) {
		props.error = serializeError(props.error);
	} else {
		props.error = null;
	}

	send('test', props);

	if (hasError && opts.failFast) {
		isFailed = true;
		exit();
	}
}

function exit() {
	var stats = runner._buildStats();

	send('results', {
		stats: stats
	});

	globals.setTimeout(close, 100);
}

globals.setImmediate(function () {
	var hasExclusive = runner.tests.hasExclusive;
	var numberOfTests = runner.tests.tests.concurrent.length + runner.tests.tests.serial.length;

	if (numberOfTests === 0) {
		send('no-tests', {avaRequired: true});
		return;
	}

	send('stats', {
		testCount: numberOfTests,
		hasExclusive: hasExclusive
	});

	runner.on('test', test);

	globals.events.on('ava-run', function (options) {
		runner.run(options).then(exit);
	});

	globals.events.on('ava-init-exit', function () {
		exit();
	});
});

module.exports = runner.test;

// TypeScript imports the `default` property for
// an ES2015 default import (`import test from 'ava'`)
// See: https://github.com/Microsoft/TypeScript/issues/2242#issuecomment-83694181
module.exports.default = runner.test;
