'use strict';
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const globby = require('globby');
const proxyquire = require('proxyquire');
const replaceString = require('replace-string');
const pkg = require('../../package.json');
const babelManager = require('../../lib/babel-manager');
const {normalizeGlobs} = require('../../lib/globs');

let _Api = null;
const createApi = options => {
	if (!_Api) {
		_Api = proxyquire('../../lib/api', {
			'./fork': proxyquire('../../lib/fork', {
				child_process: { // eslint-disable-line camelcase
					...childProcess,
					fork(filename, argv, options) {
						return childProcess.fork(path.join(__dirname, 'report-worker.js'), argv, {
							...options,
							env: {
								...options.env,
								NODE_NO_WARNINGS: '1'
							}
						});
					}
				}
			})
		});
	}

	return new _Api(options);
};

exports.assert = (t, logFile, buffer) => {
	let existing = null;
	try {
		existing = fs.readFileSync(logFile);
	} catch (_) {}

	if (existing === null || process.env.UPDATE_REPORTER_LOG) {
		fs.writeFileSync(logFile, buffer);
		existing = buffer;
	}

	const expected = existing.toString('utf8');
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
	experimentalWarning: str => str.replace(/^\(node:\d+\) ExperimentalWarning.+\n/g, ''),
	lineEndings: str => replaceString(str, '\r\n', '\n'),
	posix: str => replaceString(str, '\\', '/'),
	slow: str => str.replace(/(slow.+?)\(\d+m?s\)/g, '$1 (000ms)'),
	timeout: str => replaceString(str, 'Timeout._onTimeout', 'Timeout.setTimeout'),
	traces: str => str.replace(/(\[...)?[^\s'[]+\s\((.+\.js:\d+:\d+)\)/g, '$1$2'),
	version: str => replaceString(str, `v${pkg.version}`, 'v1.0.0-beta.5.1')
};

const run = (type, reporter, match = []) => {
	const projectDir = path.join(__dirname, '../fixture/report', type.toLowerCase());

	const babelProvider = babelManager({experiments: {}, projectDir});
	const compileEnhancements = true;
	babelProvider.validateConfig({testOptions: {}}, compileEnhancements);

	const options = {
		extensions: {
			all: ['js'],
			enhancementsOnly: [],
			babelOnly: ['js']
		},
		failFast: type === 'failFast' || type === 'failFast2',
		failWithoutAssertions: false,
		serial: type === 'failFast' || type === 'failFast2',
		require: [],
		cacheEnabled: true,
		compileEnhancements,
		experiments: {},
		match,
		babelProvider,
		resolveTestsFrom: projectDir,
		projectDir,
		timeout: type.startsWith('timeout') ? '10s' : undefined,
		concurrency: 1,
		updateSnapshots: false,
		snapshotDir: false,
		color: true,
		nodeArguments: []
	};
	let pattern = '*.js';

	if (type === 'typescript') {
		options.extensions.all.push('ts');
		options.extensions.enhancementsOnly.push('ts');
		options.compileEnhancements = false;
		options.require = ['ts-node/register'];
		pattern = '*.ts';
	}

	options.globs = normalizeGlobs(undefined, undefined, undefined, options.extensions.all);

	const api = createApi(options);
	api.on('run', plan => reporter.startRun(plan));

	const files = globby.sync(pattern, {
		absolute: true,
		brace: true,
		case: false,
		cwd: projectDir,
		dot: false,
		expandDirectories: false,
		extglob: true,
		followSymlinkedDirectories: true,
		gitignore: false,
		globstar: true,
		matchBase: false,
		onlyFiles: true,
		stats: false,
		unique: true
	}).sort();
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
exports.timeoutInSingleFile = reporter => run('timeoutInSingleFile', reporter);
exports.timeoutInMultipleFiles = reporter => run('timeoutInMultipleFiles', reporter);
exports.timeoutWithMatch = reporter => run('timeoutWithMatch', reporter, ['*needle*']);
exports.watch = reporter => run('watch', reporter);
exports.typescript = reporter => run('typescript', reporter);
exports.edgeCases = reporter => run('edge-cases', reporter);
