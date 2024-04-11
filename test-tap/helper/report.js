import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {globbySync} from 'globby';

import Api from '../../lib/api.js';
import {_testOnlyReplaceWorkerPath} from '../../lib/fork.js';
import {normalizeGlobs} from '../../lib/globs.js';
import pkg from '../../lib/pkg.cjs';
import {uint8ArrayToString} from 'uint8array-extras';

_testOnlyReplaceWorkerPath(new URL('report-worker.js', import.meta.url));

const exports = {};
export default exports;

exports.assert = (t, logFile, array) => {
	let existing = null;
	try {
		existing = fs.readFileSync(logFile);
	} catch {}

	if (existing === null || process.env.UPDATE_REPORTER_LOG) {
		fs.writeFileSync(logFile, array);
		existing = array;
	}

	const expected = uint8ArrayToString(existing);
	const actual = uint8ArrayToString(array);
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
	cwd: string => string.replaceAll(cwdFileUrlPrefix, '').replaceAll(process.cwd(), '~'),
	experimentalWarning: string => string.replaceAll(/^\(node:\d+\) ExperimentalWarning.+\n/g, ''),
	lineEndings: string => string.replaceAll('\r\n', '\n'),
	// The following are invjected by tap@18.
	posix: string => string.replaceAll('\\', '/'),
	tapLoaders: string => string.replaceAll(/.+(Module\._compile|node_modules.pirates|require\.extensions).+\r?\n/g, ''),
	timers: string => string.replaceAll(/timers\.js:\d+:\d+/g, 'timers.js'),
	version: string => string.replaceAll(`v${pkg.version}`, 'VERSION'),
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
	return api.run({files, filter, runtimeOptions: {previousFailures: 0, firstRun: true}}).then(() => {
		reporter.endRun();
		return api.run({files, filter, runtimeOptions: {previousFailures: 2, firstRun: false}});
	}).then(() => {
		reporter.endRun();
		return api.run({files, filter, runtimeOptions: {previousFailures: 0, firstRun: false}});
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
