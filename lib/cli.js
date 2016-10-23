'use strict';
var path = require('path');
var updateNotifier = require('update-notifier');
var figures = require('figures');
var arrify = require('arrify');
var meow = require('meow');
var Promise = require('bluebird');
var pkgConf = require('pkg-conf');
var isCi = require('is-ci');
var hasFlag = require('has-flag');
var Api = require('../api');
var colors = require('./colors');
var verboseReporter = require('./reporters/verbose');
var miniReporter = require('./reporters/mini');
var tapReporter = require('./reporters/tap');
var Logger = require('./logger');
var Watcher = require('./watcher');
var babelConfig = require('./babel-config');

// Bluebird specific
Promise.longStackTraces();

exports.run = function () {
	var conf = pkgConf.sync('ava');

	var filepath = pkgConf.filepath(conf);
	var pkgDir = filepath === null ? process.cwd() : path.dirname(filepath);

	var cli = meow([
		'Usage',
		'  ava [<file|directory|glob> ...]',
		'',
		'Options',
		'  --init             Add AVA to your project',
		'  --fail-fast        Stop after first test failure',
		'  --serial, -s       Run tests serially',
		'  --tap, -t          Generate TAP output',
		'  --verbose, -v      Enable verbose output',
		'  --no-cache         Disable the transpiler cache',
		'  --no-power-assert  Disable Power Assert',
		'  --match, -m        Only run tests with matching title (Can be repeated)',
		'  --watch, -w        Re-run tests when tests and source files change',
		'  --source, -S       Pattern to match source files so tests can be re-run (Can be repeated)',
		'  --timeout, -T      Set global timeout',
		'  --concurrency, -c  Maximum number of test files running at the same time (EXPERIMENTAL)',
		'',
		'Examples',
		'  ava',
		'  ava test.js test2.js',
		'  ava test-*.js',
		'  ava test',
		'  ava --init',
		'  ava --init foo.js',
		'',
		'Default patterns when no arguments:',
		'test.js test-*.js test/**/*.js **/__tests__/**/*.js **/*.test.js'
	], {
		string: [
			'_',
			'timeout',
			'source',
			'match',
			'concurrency'
		],
		boolean: [
			'fail-fast',
			'verbose',
			'serial',
			'tap',
			'watch'
		],
		default: conf,
		alias: {
			t: 'tap',
			v: 'verbose',
			s: 'serial',
			m: 'match',
			w: 'watch',
			S: 'source',
			T: 'timeout',
			c: 'concurrency'
		}
	});

	updateNotifier({pkg: cli.pkg}).notify();

	if (cli.flags.init) {
		require('ava-init')();
		return;
	}

	if (
		((hasFlag('--watch') || hasFlag('-w')) && (hasFlag('--tap') || hasFlag('-t'))) ||
		(conf.watch && conf.tap)
	) {
		throw new Error(colors.error(figures.cross) + ' The TAP reporter is not available when using watch mode.');
	}

	if (hasFlag('--require') || hasFlag('-r')) {
		throw new Error(colors.error(figures.cross) + ' The --require and -r flags are deprecated. Requirements should be configured in package.json - see documentation.');
	}

	var api = new Api({
		failFast: cli.flags.failFast,
		serial: cli.flags.serial,
		require: arrify(conf.require),
		cacheEnabled: cli.flags.cache !== false,
		powerAssert: cli.flags.powerAssert !== false,
		explicitTitles: cli.flags.watch,
		match: arrify(cli.flags.match),
		babelConfig: babelConfig.validate(conf.babel),
		resolveTestsFrom: cli.input.length === 0 ? pkgDir : process.cwd(),
		pkgDir: pkgDir,
		timeout: cli.flags.timeout,
		concurrency: cli.flags.concurrency ? parseInt(cli.flags.concurrency, 10) : 0
	});

	var reporter;

	if (cli.flags.tap && !cli.flags.watch) {
		reporter = tapReporter();
	} else if (cli.flags.verbose || isCi) {
		reporter = verboseReporter();
	} else {
		reporter = miniReporter({watching: cli.flags.watch});
	}

	reporter.api = api;
	var logger = new Logger(reporter);

	logger.start();

	api.on('test-run', function (runStatus) {
		reporter.api = runStatus;
		runStatus.on('test', logger.test);
		runStatus.on('error', logger.unhandledError);

		runStatus.on('stdout', logger.stdout);
		runStatus.on('stderr', logger.stderr);
	});

	var files = cli.input.length ? cli.input : arrify(conf.files);

	if (cli.flags.watch) {
		try {
			var watcher = new Watcher(logger, api, files, arrify(cli.flags.source));
			watcher.observeStdin(process.stdin);
		} catch (err) {
			if (err.name === 'AvaError') {
				// An AvaError may be thrown if chokidar is not installed. Log it nicely.
				console.error('  ' + colors.error(figures.cross) + ' ' + err.message);
				logger.exit(1);
			} else {
				// Rethrow so it becomes an uncaught exception.
				throw err;
			}
		}
	} else {
		api.run(files)
			.then(function (runStatus) {
				logger.finish(runStatus);
				logger.exit(runStatus.failCount > 0 || runStatus.rejectionCount > 0 || runStatus.exceptionCount > 0 ? 1 : 0);
			})
			.catch(function (err) {
				// Don't swallow exceptions. Note that any expected error should already
				// have been logged.
				setImmediate(function () {
					throw err;
				});
			});
	}
};
