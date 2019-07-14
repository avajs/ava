'use strict';
require('./lib/worker/load-chalk'); // eslint-disable-line import/no-unassigned-import

// Iron-node does not work with forked processes
// This cli command will run a single file in the current process.
// Intended to be used with iron-node for profiling purposes.

const path = require('path');
const meow = require('meow');
const Promise = require('bluebird');
const uniqueTempDir = require('unique-temp-dir');
const arrify = require('arrify');
const resolveCwd = require('resolve-cwd');
const escapeStringRegexp = require('escape-string-regexp');
const babelPipeline = require('./lib/babel-pipeline');
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
	  $ iron-node node_modules/ava/profile.js <test-file>

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

const babelConfig = babelPipeline.validate(conf.babel);
conf.extensions = normalizeExtensions(conf.extensions || [], babelConfig);

const _regexpFullExtensions = new RegExp(`\\.(${conf.extensions.full.map(ext => escapeStringRegexp(ext)).join('|')})$`);

const precompileFull = babelPipeline.build(process.cwd(), cacheDir, babelConfig, conf.compileEnhancements === true);

let precompileEnhancementsOnly = () => null;
if (conf.compileEnhancements) {
	precompileEnhancementsOnly = babelPipeline.build(projectDir, cacheDir, null, conf.compileEnhancements);
}

const precompiled = {};
precompiled[file] = _regexpFullExtensions.test(file) ? precompileFull(file) : precompileEnhancementsOnly(file);

const opts = {
	file,
	projectDir,
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	tty: false,
	cacheDir,
	precompiled,
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
