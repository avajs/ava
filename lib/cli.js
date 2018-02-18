'use strict';
const path = require('path');
const updateNotifier = require('update-notifier');
const figures = require('figures');
const arrify = require('arrify');
const meow = require('meow');
const Promise = require('bluebird');
const pkgConf = require('pkg-conf');
const isCi = require('is-ci');

// Bluebird specific
Promise.longStackTraces();

function exit(message) {
	console.error(`\n  ${require('./chalk').get().red(figures.cross)} ${message}`);
	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

exports.run = () => { // eslint-disable-line complexity
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
	require('./chalk').set({enabled: cli.flags.color});

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

	if ('source' in conf) {
		exit('The \'source\' option has been renamed. Use \'sources\' instead.');
	}

	const Api = require('../api');
	const VerboseReporter = require('./reporters/verbose');
	const MiniReporter = require('./reporters/mini');
	const TapReporter = require('./reporters/tap');
	const Watcher = require('./watcher');
	const babelConfigHelper = require('./babel-config');

	let babelConfig = null;
	try {
		babelConfig = babelConfigHelper.validate(conf.babel);
	} catch (err) {
		exit(err.message);
	}

	// Copy resultant cli.flags into conf for use with Api and elsewhere
	Object.assign(conf, cli.flags);

	const match = arrify(conf.match);
	const api = new Api({
		failFast: conf.failFast,
		failWithoutAssertions: conf.failWithoutAssertions !== false,
		serial: conf.serial,
		require: arrify(conf.require),
		cacheEnabled: conf.cache,
		compileEnhancements: conf.compileEnhancements !== false,
		match,
		babelConfig,
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
		reporter = new TapReporter({
			reportStream: process.stdout,
			stdStream: process.stderr
		});
	} else if (conf.verbose || isCi) {
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

	api.on('run', plan => reporter.startRun(plan));

	const files = cli.input.length ? cli.input : arrify(conf.files);

	if (conf.watch) {
		const watcher = new Watcher(reporter, api, files, arrify(conf.sources));
		watcher.observeStdin(process.stdin);
	} else {
		api.run(files).then(runStatus => {
			process.exitCode = runStatus.suggestExitCode({matching: match.length > 0});
			reporter.endRun();
		});
	}
};
