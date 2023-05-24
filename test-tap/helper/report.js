import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {globbySync} from 'globby';
import replaceString from 'replace-string';

import Api from '../../lib/api.js';
import {_testOnlyReplaceWorkerPath} from '../../lib/fork.js';
import {normalizeGlobs} from '../../lib/globs.js';
import pkg from '../../lib/pkg.cjs';

_testOnlyReplaceWorkerPath(new URL('report-worker.js', import.meta.url));

const exports = {};
export default exports;

exports.assert = (t, logFile, buffer) => {
	let existing = null;
	try {
		existing = fs.readFileSync(logFile);
	} catch {}

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
		t.fail(`Output did not match expectation: ${logFile}`);
	}
};

const cwdFileUrlPrefix = pathToFileURL(process.cwd());

exports.sanitizers = {
	acorn: string => string.split('\n').filter(line => !/node_modules.acorn/.test(line)).join('\n'),
	cwd: string => replaceString(replaceString(string, cwdFileUrlPrefix, ''), process.cwd(), '~'),
	experimentalWarning: string => string.replace(/^\(node:\d+\) ExperimentalWarning.+\n/g, ''),
	lineEndings: string => replaceString(string, '\r\n', '\n'),
	posix: string => replaceString(string, '\\', '/'),
	timers: string => string.replace(/timers\.js:\d+:\d+/g, 'timers.js'),
	version: string => replaceString(string, `v${pkg.version}`, 'VERSION'),
};

const __dirname = fileURLToPath(new URL('.', import.meta.url));
exports.projectDir = type => path.join(__dirname, '../fixture/report', type.toLowerCase());

const run = async (type, reporter, {match = [], filter} = {}) => {
	const projectDir = exports.projectDir(type);

	const providers = [];

	const options = {
		extensions: ['cjs'],
		failFast: type === 'failFast' || type === 'failFast2',
		failWithoutAssertions: false,
		serial: type === 'failFast' || type === 'failFast2',
		require: [],
		cacheEnabled: false,
		experiments: {},
		match,
		providers,
		projectDir,
		timeout: type.startsWith('timeout') ? '2.5s' : undefined,
		concurrency: 1,
		updateSnapshots: false,
		snapshotDir: false,
		chalkOptions: {level: 1},
		workerThreads: false,
		env: {
			NODE_NO_WARNINGS: '1',
		},
	};

	options.globs = normalizeGlobs({extensions: options.extensions, files: ['*'], providers: []});

	const api = new Api(options);
	api.on('run', plan => reporter.startRun(plan));

	const files = globbySync('*.cjs', {
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
		unique: true,
	}).sort();
	if (type !== 'watch') {
		return api.run({files, filter}).then(() => {
			reporter.endRun();
		});
	}

	// Mimick watch mode
	return api.run({files, filter, runtimeOptions: {clearLogOnNextRun: false, previousFailures: 0, runVector: 1}}).then(() => {
		reporter.endRun();
		return api.run({files, filter, runtimeOptions: {clearLogOnNextRun: true, previousFailures: 2, runVector: 2}});
	}).then(() => {
		reporter.endRun();
		return api.run({files, filter, runtimeOptions: {clearLogOnNextRun: false, previousFailures: 0, runVector: 3}});
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
exports.timeoutWithMatch = reporter => run('timeoutWithMatch', reporter, {match: ['*needle*']});
exports.timeoutContextLogs = reporter => run('timeoutContextLogs', reporter);
exports.watch = reporter => run('watch', reporter);
exports.edgeCases = reporter => run('edgeCases', reporter, {
	filter: [
		{pattern: '**/*'},
		{pattern: '**/test.cjs', lineNumbers: [2]},
		{pattern: '**/ast-syntax-error.cjs', lineNumbers: [7]},
	],
});
