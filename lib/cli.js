'use strict';
const path = require('path');
const fs = require('fs');
const del = require('del');
const updateNotifier = require('update-notifier');
const figures = require('figures');
const arrify = require('arrify');
const meow = require('meow');
const Promise = require('bluebird');
const isCi = require('is-ci');
const loadConfig = require('./load-config');

// Bluebird specific
Promise.longStackTraces();

function exit(message) {
	console.error(`\n${require('./chalk').get().red(figures.cross)} ${message}`);
	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

exports.run = async () => { // eslint-disable-line complexity
	const {flags: {config: configFile}} = meow({ // Process the --config flag first
		autoHelp: false, // --help should get picked up by the next meow invocation.
		flags: {
			config: {type: 'string'}
		}
	});

	let conf = {};
	let confError = null;
	try {
		conf = loadConfig({configFile});
	} catch (error) {
		confError = error;
	}

	const cli = meow(`
		Usage
		  ava [<file> ...]

		Options
		  --watch, -w             Re-run tests when tests and source files change
		  --match, -m             Only run tests with matching title (Can be repeated)
		  --update-snapshots, -u  Update snapshots
		  --fail-fast             Stop after first test failure
		  --timeout, -T           Set global timeout (milliseconds or human-readable, e.g. 10s, 2m)
		  --serial, -s            Run tests serially
		  --concurrency, -c       Max number of test files running at the same time (Default: CPU cores)
		  --verbose, -v           Enable verbose output
		  --tap, -t               Generate TAP output
		  --color                 Force color output
		  --no-color              Disable color output
		  --reset-cache           Reset AVA's compilation cache and exit
		  --config                JavaScript file for AVA to read its config from, instead of using package.json
		                          or ava.config.js files

		Examples
		  ava
		  ava test.js test2.js
		  ava test-*.js
		  ava test

		The above relies on your shell expanding the glob patterns.
		Without arguments, AVA uses the following patterns:
		  **/test.js **/test-*.js **/*.spec.js **/*.test.js **/test/**/*.js **/tests/**/*.js **/__tests__/**/*.js
	`, {
		flags: {
			watch: {
				type: 'boolean',
				alias: 'w'
			},
			match: {
				type: 'string',
				alias: 'm',
				default: conf.match
			},
			'update-snapshots': {
				type: 'boolean',
				alias: 'u'
			},
			'fail-fast': {
				type: 'boolean',
				default: conf.failFast
			},
			timeout: {
				type: 'string',
				alias: 'T',
				default: conf.timeout
			},
			serial: {
				type: 'boolean',
				alias: 's',
				default: conf.serial
			},
			concurrency: {
				type: 'string',
				alias: 'c',
				default: conf.concurrency
			},
			verbose: {
				type: 'boolean',
				alias: 'v',
				default: conf.verbose
			},
			tap: {
				type: 'boolean',
				alias: 't',
				default: conf.tap
			},
			color: {
				type: 'boolean',
				default: 'color' in conf ? conf.color : require('supports-color').stdout !== false
			},
			'reset-cache': {
				type: 'boolean',
				default: false
			},
			'--': {
				type: 'string'
			}
		}
	});

	updateNotifier({pkg: cli.pkg}).notify();
	const chalk = require('./chalk').set({enabled: cli.flags.color});

	if (confError) {
		if (confError.parent) {
			exit(`${confError.message}\n\n${chalk.gray((confError.parent && confError.parent.stack) || confError.parent)}`);
		} else {
			exit(confError.message);
		}
	}

	const {projectDir} = conf;
	if (cli.flags.resetCache) {
		const cacheDir = path.join(projectDir, 'node_modules', '.cache', 'ava');
		try {
			await del('*', {
				cwd: cacheDir,
				nodir: true
			});
			console.error(`\n${chalk.green(figures.tick)} Removed AVA cache files in ${cacheDir}`);
			process.exit(0); // eslint-disable-line unicorn/no-process-exit
		} catch (error) {
			exit(`Error removing AVA cache files in ${cacheDir}\n\n${chalk.gray((error && error.stack) || error)}`);
		}

		return;
	}

	if (cli.flags.watch && cli.flags.tap && !conf.tap) {
		exit('The TAP reporter is not available when using watch mode.');
	}

	if (cli.flags.watch && isCi) {
		exit('Watch mode is not available in CI, as it prevents AVA from terminating.');
	}

	if (
		cli.flags.concurrency === '' ||
		(cli.flags.concurrency && (!Number.isInteger(Number.parseFloat(cli.flags.concurrency)) || parseInt(cli.flags.concurrency, 10) < 0))
	) {
		exit('The --concurrency or -c flag must be provided with a nonnegative integer.');
	}

	const ciParallelVars = require('ci-parallel-vars');
	const Api = require('./api');
	const VerboseReporter = require('./reporters/verbose');
	const MiniReporter = require('./reporters/mini');
	const TapReporter = require('./reporters/tap');
	const Watcher = require('./watcher');
	const babelPipeline = require('./babel-pipeline');
	const normalizeExtensions = require('./extensions');
	const {normalizeGlobs} = require('./globs');
	const validateEnvironmentVariables = require('./environment-variables');

	let babelConfig = null;
	try {
		babelConfig = babelPipeline.validate(conf.babel);
	} catch (error) {
		exit(error.message);
	}

	let environmentVariables;
	try {
		environmentVariables = validateEnvironmentVariables(conf.environmentVariables);
	} catch (error) {
		exit(error.message);
	}

	let extensions;
	try {
		extensions = normalizeExtensions(conf.extensions || [], babelConfig);
	} catch (error) {
		exit(error.message);
	}

	let globs;
	try {
		globs = normalizeGlobs(conf.files, conf.helpers, conf.sources, extensions.all);
	} catch (error) {
		exit(error.message);
	}

	// Copy resultant cli.flags into conf for use with Api and elsewhere
	Object.assign(conf, cli.flags);

	let parallelRuns = null;
	if (isCi && ciParallelVars) {
		const {index: currentIndex, total: totalRuns} = ciParallelVars;
		parallelRuns = {currentIndex, totalRuns};
	}

	const match = arrify(conf.match);
	const resolveTestsFrom = cli.input.length === 0 ? projectDir : process.cwd();

	const files = cli.input.map(file => path.relative(resolveTestsFrom, path.resolve(process.cwd(), file)));

	for (const file of cli.input) {
		try {
			const stats = fs.statSync(file);
			if (!stats.isFile()) {
				exit(`${file} is not a test file.`);
			}
		} catch (error) {
			if (error.code === 'ENOENT') {
				exit(`${file} does not exist.`);
			} else {
				exit(`Error accessing ${file}\n\n${chalk.gray((error && error.stack) || error)}`);
			}
		}
	}

	const api = new Api({
		babelConfig,
		cacheEnabled: conf.cache !== false,
		color: conf.color,
		compileEnhancements: conf.compileEnhancements !== false,
		concurrency: conf.concurrency ? parseInt(conf.concurrency, 10) : 0,
		extensions,
		failFast: conf.failFast,
		failWithoutAssertions: conf.failWithoutAssertions !== false,
		globs,
		environmentVariables,
		match,
		parallelRuns,
		projectDir,
		ranFromCli: true,
		require: arrify(conf.require),
		resolveTestsFrom,
		serial: conf.serial,
		snapshotDir: conf.snapshotDir ? path.resolve(projectDir, conf.snapshotDir) : null,
		timeout: conf.timeout,
		updateSnapshots: conf.updateSnapshots,
		workerArgv: cli.flags['--']
	});

	let reporter;
	if (conf.tap && !conf.watch) {
		reporter = new TapReporter({
			reportStream: process.stdout,
			stdStream: process.stderr
		});
	} else if (conf.verbose || isCi || !process.stdout.isTTY) {
		reporter = new VerboseReporter({
			reportStream: process.stdout,
			stdStream: process.stderr,
			watching: conf.watch
		});
	} else {
		reporter = new MiniReporter({
			reportStream: process.stdout,
			stdStream: process.stderr,
			watching: conf.watch
		});
	}

	api.on('run', plan => {
		reporter.startRun(plan);

		plan.status.on('stateChange', evt => {
			if (evt.type === 'interrupt') {
				reporter.endRun();
				process.exit(1); // eslint-disable-line unicorn/no-process-exit
			}
		});
	});

	if (conf.watch) {
		const watcher = new Watcher({
			api,
			reporter,
			files,
			globs,
			resolveTestsFrom
		});
		watcher.observeStdin(process.stdin);
	} else {
		const runStatus = await api.run(files);
		process.exitCode = runStatus.suggestExitCode({matching: match.length > 0});
		reporter.endRun();
	}
};
