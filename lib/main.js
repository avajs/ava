'use strict';
const worker = require('./test-worker');
const adapter = require('./process-adapter');
const serializeError = require('./serialize-error');
const globals = require('./globals');
const Runner = require('./runner');

const opts = globals.options;
const runner = new Runner({
	bail: opts.failFast,
	failWithoutAssertions: opts.failWithoutAssertions,
	file: opts.file,
	match: opts.match,
	projectDir: opts.projectDir,
	serial: opts.serial,
	updateSnapshots: opts.updateSnapshots,
	snapshotDir: opts.snapshotDir
});

worker.setRunner(runner);

// If fail-fast is enabled, use this variable to detect
// that no more tests should be logged
let isFailed = false;

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

	adapter.send('test', props);

	if (hasError && opts.failFast) {
		isFailed = true;
		exit();
	}
}

function exit() {
	// Reference the IPC channel now that tests have finished running.
	adapter.ipcChannel.ref();

	const stats = runner.buildStats();
	adapter.send('results', {stats});
}

globals.setImmediate(() => {
	const hasExclusive = runner.tests.hasExclusive;
	const numberOfTests = runner.tests.testCount;

	if (numberOfTests === 0) {
		adapter.send('no-tests', {avaRequired: true});
		return;
	}

	adapter.send('stats', {
		testCount: numberOfTests,
		hasExclusive
	});

	runner.on('test', test);

	process.on('ava-run', options => {
		// Unreference the IPC channel. This stops it from keeping the event loop
		// busy, which means the `beforeExit` event can be used to detect when tests
		// stall.
		adapter.ipcChannel.unref();

		runner.run(options)
			.then(() => {
				runner.saveSnapshotState();

				return exit();
			})
			.catch(err => {
				process.emit('uncaughtException', err);
			});
	});

	process.on('ava-init-exit', () => {
		exit();
	});
});

module.exports = runner.chain;

// TypeScript imports the `default` property for
// an ES2015 default import (`import test from 'ava'`)
// See: https://github.com/Microsoft/TypeScript/issues/2242#issuecomment-83694181
module.exports.default = runner.chain;
