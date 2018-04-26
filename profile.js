'use strict';
require('./lib/worker/load-chalk'); // eslint-disable-line import/no-unassigned-import

// Iron-node does not work with forked processes
// This cli command will run a single file in the current process.
// Intended to be used with iron-node for profiling purposes.

const path = require('path');
const meow = require('meow');
const Promise = require('bluebird');
const pkgConf = require('pkg-conf');
const uniqueTempDir = require('unique-temp-dir');
const arrify = require('arrify');
const resolveCwd = require('resolve-cwd');
const babelConfigHelper = require('./lib/babel-config');
const CachingPrecompiler = require('./lib/caching-precompiler');
const RunStatus = require('./lib/run-status');
const VerboseReporter = require('./lib/reporters/verbose');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd.silent(name);

		if (modulePath === null) {
			throw new Error(`Could not resolve required module '${name}'`);
		}

		return modulePath;
	});
}

Promise.longStackTraces();

const conf = pkgConf.sync('ava', {
	defaults: {
		babel: {
			testOptions: {}
		},
		compileEnhancements: true
	}
});

const filepath = pkgConf.filepath(conf);
const projectDir = filepath === null ? process.cwd() : path.dirname(filepath);

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

babelConfigHelper.build(process.cwd(), cacheDir, babelConfigHelper.validate(conf.babel), conf.compileEnhancements === true)
	.then(result => {
		const precompiled = {};
		if (result) {
			const precompiler = new CachingPrecompiler({
				path: cacheDir,
				getBabelOptions: result.getOptions,
				babelCacheKeys: result.cacheKeys
			});

			precompiled[file] = precompiler.precompileFile(file);
		}

		const opts = {
			file,
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

		const runStatus = new RunStatus([file]);
		runStatus.observeWorker({
			file,
			onStateChange(listener) {
				const emit = evt => listener(Object.assign(evt, {testFile: file}));
				process.send = data => {
					if (data && data.ava) {
						const evt = data.ava;
						if (evt.type === 'ping') {
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

		// The "subprocess" will read process.argv[2] for options
		process.argv[2] = JSON.stringify(opts);
		process.argv.length = 3;

		if (console.profile) {
			console.profile('AVA test-worker process');
		}

		setImmediate(() => {
			require('./lib/worker/subprocess'); // eslint-disable-line import/no-unassigned-import
		});
	});
