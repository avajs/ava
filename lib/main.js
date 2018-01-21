'use strict';
const serializeError = require('./serialize-error');
const globals = require('./globals');
const Runner = require('./runner');

const testPath = module.parent.parent.filename;
const opts = global.__shared.options;

const runner = new Runner({
	bail: opts.failFast,
	failWithoutAssertions: opts.failWithoutAssertions,
	file: testPath,
	match: opts.match,
	projectDir: opts.projectDir,
	serial: opts.serial,
	updateSnapshots: opts.updateSnapshots,
	snapshotDir: opts.snapshotDir
});

const ipcMain = global.__shared.ipcMain[testPath];
const ipcWorker = global.__shared.ipcWorker[testPath];
global.__shared.runner[testPath] = runner;

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

	ipcMain.send('test', props);

	if (hasError && opts.failFast) {
		isFailed = true;
		exit();
	}
}

function exit() {
	// Reference the IPC channel now that tests have finished running.
	ipcMain.ipcChannel.ref();

	const stats = runner.buildStats();
	ipcMain.send('results', {stats});
}

globals.setImmediate(() => {
	const hasExclusive = runner.tests.hasExclusive;
	const numberOfTests = runner.tests.testCount;

	if (numberOfTests === 0) {
		ipcMain.send('no-tests', {avaRequired: true});
		return;
	}

	runner.on('test', test);

	ipcWorker.on('ava-run', options => {
		// Unreference the IPC channel. This stops it from keeping the event loop
		// busy, which means the `beforeExit` event can be used to detect when tests
		// stall.
		ipcMain.ipcChannel.unref();

		runner.run(options)
			.then(() => {
				runner.saveSnapshotState();

				return exit();
			})
			.catch(err => {
				process.emit('uncaughtException', err);
			});
	});

	ipcWorker.on('ava-init-exit', () => {
		exit();
	});

	ipcMain.send('stats', {
		testCount: numberOfTests,
		hasExclusive
	});
});

module.exports = runner.chain;

// TypeScript imports the `default` property for
// an ES2015 default import (`import test from 'ava'`)
// See: https://github.com/Microsoft/TypeScript/issues/2242#issuecomment-83694181
module.exports.default = runner.chain;
