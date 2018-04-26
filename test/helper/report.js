'use strict';
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const globby = require('globby');
const proxyquire = require('proxyquire');
const replaceString = require('replace-string');

let _Api = null;
const createApi = options => {
	if (!_Api) {
		_Api = proxyquire('../../api', {
			'./lib/fork': proxyquire('../../lib/fork', {
				child_process: Object.assign({}, childProcess, { // eslint-disable-line camelcase
					fork(filename, argv, options) {
						return childProcess.fork(path.join(__dirname, 'report-worker.js'), argv, options);
					}
				})
			})
		});
	}

	return new _Api(options);
};

// At least in Appveyor with Node.js 6, IPC can overtake stdout/stderr
let hasReliableStdIO = true;
exports.captureStdIOReliability = () => {
	if (process.platform === 'win32' && parseInt(process.versions.node, 10) < 8) {
		hasReliableStdIO = false;
	}
};

exports.assert = (t, logFile, buffer, stripOptions) => {
	let existing = null;
	try {
		existing = fs.readFileSync(logFile);
	} catch (err) {}
	if (existing === null || process.env.UPDATE_REPORTER_LOG) {
		fs.writeFileSync(logFile, buffer);
		existing = buffer;
	}

	let expected = existing.toString('utf8');
	// At least in Appveyor with Node.js 6, IPC can overtake stdout/stderr. This
	// causes the reporter to emit in a different order, resulting in a test
	// failure. "Fix" by not asserting on the stdout/stderr reporting at all.
	if (stripOptions.stripStdIO && !hasReliableStdIO) {
		expected = expected.replace(/(---tty-stream-chunk-separator\n)(stderr|stdout)\n/g, stripOptions.alsoStripSeparator ? '' : '$1');
	}

	const actual = buffer.toString('utf8');
	if (actual === expected) {
		t.pass();
	} else {
		// Log the entire actual and expected values, so they can be diffed
		// manually. TAP's diff output is really confusing in this situation.
		console.dir({actual, expected});
		t.fail('Output did not match expectation');
	}
};

exports.sanitizers = {
	cwd: str => replaceString(str, process.cwd(), '~'),
	posix: str => replaceString(str, '\\', '/'),
	slow: str => str.replace(/(slow.+?)\(\d+m?s\)/g, '$1 (000ms)'),
	// At least in Appveyor with Node.js 6, IPC can overtake stdout/stderr. This
	// causes the reporter to emit in a different order, resulting in a test
	// failure. "Fix" by not asserting on the stdout/stderr reporting at all.
	unreliableProcessIO(str) {
		if (hasReliableStdIO) {
			return str;
		}
		return str === 'stdout\n' || str === 'stderr\n' ? '' : str;
	}
};

const run = (type, reporter) => {
	const projectDir = path.join(__dirname, '../fixture/report', type.toLowerCase());

	const api = createApi({
		failFast: type === 'failFast' || type === 'failFast2',
		failWithoutAssertions: false,
		serial: type === 'failFast' || type === 'failFast2',
		require: [],
		cacheEnable: true,
		compileEnhancements: true,
		match: [],
		babelConfig: {testOptions: {}},
		resolveTestsFrom: projectDir,
		projectDir,
		timeout: undefined,
		concurrency: 1,
		updateSnapshots: false,
		snapshotDir: false,
		color: true
	});

	api.on('run', plan => reporter.startRun(plan));

	const files = globby.sync('*.js', {cwd: projectDir}).sort();
	if (type !== 'watch') {
		return api.run(files).then(() => {
			reporter.endRun();
		});
	}

	// Mimick watch mode
	return api.run(files, {clearLogOnNextRun: false, previousFailures: 0, runVector: 1}).then(() => {
		reporter.endRun();
		return api.run(files, {clearLogOnNextRun: true, previousFailures: 2, runVector: 2});
	}).then(() => {
		reporter.endRun();
		return api.run(files, {clearLogOnNextRun: false, previousFailures: 0, runVector: 3});
	}).then(() => {
		reporter.endRun();
	});
};

exports.regular = reporter => run('regular', reporter);
exports.failFast = reporter => run('failFast', reporter);
exports.failFast2 = reporter => run('failFast2', reporter);
exports.only = reporter => run('only', reporter);
exports.watch = reporter => run('watch', reporter);
