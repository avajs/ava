'use strict';
const process = require('./process-adapter');
const serializeError = require('./serialize-error');
const globals = require('./globals');
const Runner = require('./runner');
const send = process.send;

const opts = globals.options;
const runner = new Runner({
	serial: opts.serial,
	bail: opts.failFast,
	match: opts.match
});

// Note that test files have require('ava')
require('./test-worker').avaRequired = true;

// If fail-fast is enabled, use this variable to detect
// that no more tests should be logged
let isFailed = false;

Error.stackTraceLimit = Infinity;

function test(props) {
	if (isFailed) {
		return;
	}

	const hasError = typeof props.error !== 'undefined';

	// Don't display anything if it's a passed hook
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
	const stats = runner._buildStats();

	send('results', {stats});
}

globals.setImmediate(() => {
	const hasExclusive = runner.tests.hasExclusive;
	const numberOfTests = runner.tests.testCount;

	if (numberOfTests === 0) {
		send('no-tests', {avaRequired: true});
		return;
	}

	send('stats', {
		testCount: numberOfTests,
		hasExclusive
	});

	runner.on('test', test);

	process.on('ava-run', options => {
		runner.run(options)
			.then(exit)
			.catch(err => {
				process.emit('uncaughtException', err);
			});
	});

	process.on('ava-init-exit', () => {
		exit();
	});
});

module.exports = runner.test;

// TypeScript imports the `default` property for
// an ES2015 default import (`import test from 'ava'`)
// See: https://github.com/Microsoft/TypeScript/issues/2242#issuecomment-83694181
module.exports.default = runner.test;
