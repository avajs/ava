'use strict';
require('./lib/worker/load-chalk'); // eslint-disable-line import/no-unassigned-import

const path = require('path');
const meow = require('meow');
const Promise = require('bluebird');
const uniqueTempDir = require('unique-temp-dir');
const arrify = require('arrify');
const resolveCwd = require('resolve-cwd');
const escapeStringRegexp = require('escape-string-regexp');
const babelManager = require('./lib/babel-manager');
const RunStatus = require('./lib/run-status');
const VerboseReporter = require('./lib/reporters/verbose');
const loadConfig = require('./lib/load-config');
const normalizeExtensions = require('./lib/extensions');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd.silent(name);

		if (modulePath === undefined) {
			throw new Error(`Could not resolve required module '${name}'`);
		}

		return modulePath;
	});
}

Promise.longStackTraces();

const conf = loadConfig({
	defaults: {
		babel: {
			testOptions: {}
		},
		compileEnhancements: true
	}
});

const {projectDir} = conf;
// Define a minimal set of options from the main CLI
const cli = meow(`
	Usage
	  $ node_modules/ava/profile.js <test-file>

	Options
	  --fail-fast   Stop after first test failure
	  --serial, -s  Run tests serially

`, {
	string: [
		'_'
	],
	boolean: [
		'fail-fast',
		'verbose',
		'serial',
		'tap'
	],
	default: conf,
	alias: {
		s: 'serial'
	}
});

if (cli.input.length === 0) {
	throw new Error('Specify a test file');
}

const file = path.resolve(cli.input[0]);
const cacheDir = conf.cacheEnabled === false ? uniqueTempDir() : path.join(projectDir, 'node_modules', '.cache', 'ava');

const {nonSemVerExperiments: experiments} = conf;
let babelProvider;
if (!experiments.noBabelOutOfTheBox || conf.babel !== undefined) {
	babelProvider = babelManager({experiments, projectDir});
	babelProvider.validateConfig(conf.babel, conf.compileEnhancements !== false);
}

conf.extensions = normalizeExtensions(conf.extensions, babelProvider, {experiments});

const _regexpBabelExtensions = new RegExp(`\\.(${conf.extensions.babelOnly.map(ext => escapeStringRegexp(ext)).join('|')})$`);

const babelState = _regexpBabelExtensions.test(file) ?
	babelProvider.compile({cacheDir, testFiles: [file], helperFiles: []}) :
	(babelProvider.legacy && babelProvider.compileEnhancementsOnly !== null ?
		babelProvider.compileEnhancementsOnly({cacheDir, testFiles: [file], helperFiles: []}) :
		null);

const opts = {
	experiments,
	file,
	projectDir,
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	tty: false,
	cacheDir,
	babelState,
	require: resolveModules(conf.require)
};

// Mock the behavior of a parent process
process.connected = true;
process.channel = {ref() {}, unref() {}};

const reporter = new VerboseReporter({
	reportStream: process.stdout,
	stdStream: process.stderr,
	watching: false
});

const runStatus = new RunStatus(1, null);
runStatus.observeWorker({
	file,
	onStateChange(listener) {
		const emit = evt => listener(Object.assign(evt, {testFile: file}));
		process.send = data => {
			if (data && data.ava) {
				const evt = data.ava;
				if (evt.type === 'ready-for-options') {
					process.emit('message', {ava: {type: 'options', options: opts}});
				} else if (evt.type === 'ping') {
					if (console.profileEnd) {
						console.profileEnd();
					}

					if (process.exitCode) {
						emit({type: 'worker-failed', nonZeroExitCode: process.exitCode});
					} else {
						emit({type: 'worker-finished', forcedExit: false});
						process.exitCode = runStatus.suggestExitCode({matching: false});
					}

					setImmediate(() => {
						reporter.endRun();
						process.emit('message', {ava: {type: 'pong'}});
					});
				} else {
					emit(data.ava);
				}
			}
		};
	}
}, file);

reporter.startRun({
	failFastEnabled: false,
	files: [file],
	matching: false,
	previousFailures: 0,
	status: runStatus
});

process.on('beforeExit', () => {
	process.exitCode = process.exitCode || runStatus.suggestExitCode({matching: false});
});

if (console.profile) {
	console.profile('AVA test-worker process');
}

setImmediate(() => {
	require('./lib/worker/subprocess'); // eslint-disable-line import/no-unassigned-import
});
