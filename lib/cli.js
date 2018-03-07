'use strict';
const path = require('path');
const updateNotifier = require('update-notifier');
const figures = require('figures');
const arrify = require('arrify');
const meow = require('meow');
const Promise = require('bluebird');
const pkgConf = require('pkg-conf');
const isCi = require('is-ci');
const Api = require('../api');
const colors = require('./colors');
const VerboseReporter = require('./reporters/verbose');
const MiniReporter = require('./reporters/mini');
const TapReporter = require('./reporters/tap');
const Logger = require('./logger');
const Watcher = require('./watcher');
const babelConfigHelper = require('./babel-config');

// Bluebird specific
Promise.longStackTraces();

exports.run = () => {
	const conf = pkgConf.sync('ava');

	const filepath = pkgConf.filepath(conf);
	const projectDir = filepath === null ? process.cwd() : path.dirname(filepath);

	const cli = meow(`
		Usage
		  ava [<file|directory|glob> ...]

		Options
		  --watch, -w             Re-run tests when tests and source files change
		  --match, -m             Only run tests with matching title (Can be repeated)
		  --update-snapshots, -u  Update snapshots
		  --fail-fast             Stop after first test failure
		  --timeout, -T           Set global timeout
		  --serial, -s            Run tests serially
		  --concurrency, -c       Max number of test files running at the same time (Default: CPU cores)
		  --verbose, -v           Enable verbose output
		  --tap, -t               Generate TAP output
		  --no-cache              Disable the compiler cache
		  --color                 Force color output
		  --no-color              Disable color output

		Examples
		  ava
		  ava test.js test2.js
		  ava test-*.js
		  ava test

		Default patterns when no arguments:
		test.js test-*.js test/**/*.js **/__tests__/**/*.js **/*.test.js
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
			cache: {
				type: 'boolean',
				default: conf.cache !== false
			},
			color: {
				type: 'boolean',
				default: 'color' in conf ? conf.color : require('supports-color').stdout !== false
			},
			'--': {
				type: 'string'
			}
		}
	});

	updateNotifier({pkg: cli.pkg}).notify();

	if (cli.flags.watch && cli.flags.tap && !conf.tap) {
		throw new Error(`${colors.error(figures.cross)} The TAP reporter is not available when using watch mode.`);
	}

	if (cli.flags.watch && isCi) {
		throw new Error(`${colors.error(figures.cross)} Watch mode is not available in CI, as it prevents AVA from terminating.`);
	}

	if (
		cli.flags.concurrency === '' ||
		(cli.flags.concurrency && (!Number.isInteger(Number.parseFloat(cli.flags.concurrency)) || parseInt(cli.flags.concurrency, 10) < 0))
	) {
		throw new Error(`${colors.error(figures.cross)} The --concurrency or -c flag must be provided with a nonnegative integer.`);
	}

	if ('source' in conf) {
		throw new Error(`${colors.error(figures.cross)} The 'source' option has been renamed. Use 'sources' instead.`);
	}

	// Copy resultant cli.flags into conf for use with Api and elsewhere
	Object.assign(conf, cli.flags);

	const api = new Api({
		failFast: conf.failFast,
		failWithoutAssertions: conf.failWithoutAssertions !== false,
		serial: conf.serial,
		require: arrify(conf.require),
		cacheEnabled: conf.cache,
		compileEnhancements: conf.compileEnhancements !== false,
		explicitTitles: conf.watch,
		match: arrify(conf.match),
		babelConfig: babelConfigHelper.validate(conf.babel),
		resolveTestsFrom: cli.input.length === 0 ? projectDir : process.cwd(),
		projectDir,
		timeout: conf.timeout,
		concurrency: conf.concurrency ? parseInt(conf.concurrency, 10) : 0,
		updateSnapshots: conf.updateSnapshots,
		snapshotDir: conf.snapshotDir ? path.resolve(projectDir, conf.snapshotDir) : null,
		color: conf.color,
		workerArgv: cli.flags['--']
	});

	let reporter;

	if (conf.tap && !conf.watch) {
		reporter = new TapReporter();
	} else if (conf.verbose || isCi) {
		reporter = new VerboseReporter({color: conf.color, watching: conf.watch});
	} else {
		reporter = new MiniReporter({color: conf.color, watching: conf.watch});
	}

	reporter.api = api;
	const logger = new Logger(reporter);

	logger.start();

	api.on('test-run', runStatus => {
		reporter.api = runStatus;
		runStatus.on('test', logger.test);
		runStatus.on('error', logger.unhandledError);

		runStatus.on('stdout', logger.stdout);
		runStatus.on('stderr', logger.stderr);
	});

	const files = cli.input.length ? cli.input : arrify(conf.files);

	if (conf.watch) {
		try {
			const watcher = new Watcher(logger, api, files, arrify(conf.sources));
			watcher.observeStdin(process.stdin);
		} catch (err) {
			if (err.name === 'AvaError') {
				// An AvaError may be thrown if `chokidar` is not installed. Log it nicely.
				console.error(`  ${colors.error(figures.cross)} ${err.message}`);
				logger.exit(1);
			} else {
				// Rethrow so it becomes an uncaught exception
				throw err;
			}
		}
	} else {
		api.run(files)
			.then(runStatus => {
				logger.finish(runStatus);
				logger.exit(runStatus.failCount > 0 || runStatus.rejectionCount > 0 || runStatus.exceptionCount > 0 ? 1 : 0);
			})
			.catch(err => {
				// Don't swallow exceptions. Note that any expected error should already
				// have been logged.
				setImmediate(() => {
					throw err;
				});
			});
	}
};
