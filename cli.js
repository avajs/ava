#!/usr/bin/env node
'use strict';

var debug = require('debug')('ava');

// Prefer the local installation of AVA.
var resolveCwd = require('resolve-cwd');
var localCLI = resolveCwd('ava/cli');

if (localCLI && localCLI !== __filename) {
	debug('Using local install of AVA');
	require(localCLI);
	return;
}

if (debug.enabled) {
	require('time-require');
}

var fs = require('fs');
var uniqueTempDir = require('unique-temp-dir');
var findCacheDir = require('find-cache-dir');
var updateNotifier = require('update-notifier');
var figures = require('figures');
var arrify = require('arrify');
var meow = require('meow');
var Promise = require('bluebird');
var pkgConf = require('pkg-conf');
var chalk = require('chalk');
var isCi = require('is-ci');
var hasFlag = require('has-flag');
var through = require('through');
var colors = require('./lib/colors');
var CachingPrecompiler = require('./lib/caching-precompiler');
var verboseReporter = require('./lib/reporters/verbose');
var miniReporter = require('./lib/reporters/mini');
var tapReporter = require('./lib/reporters/tap');
var AvaFiles = require('./lib/ava-files');
var Logger = require('./lib/logger');
var Watcher = require('./lib/watcher');
var Api = require('./api');

// Bluebird specific
Promise.longStackTraces();

var conf = pkgConf.sync('ava', {
	defaults: {
		babel: 'default'
	}
});

// check for valid babel config shortcuts (can be either "default" or "inherit")
var isValidShortcut = ['default', 'inherit'].indexOf(conf.babel) !== -1;

if (!conf.babel || (typeof conf.babel === 'string' && !isValidShortcut)) {
	var message = '';
	message += 'Unexpected Babel configuration for AVA. ';
	message += 'See ' + chalk.underline('https://github.com/avajs/ava#es2015-support') + ' for allowed values.';

	console.log('\n  ' + colors.error(figures.cross) + ' ' + message);
	process.exit(1);
}

var cli = meow([
	'Usage',
	'  ava [<file|directory|glob> ...]',
	'',
	'Options',
	'  --init             Add AVA to your project',
	'  --fail-fast        Stop after first test failure',
	'  --serial, -s       Run tests serially',
	'  --require, -r      Module to preload (Can be repeated)',
	'  --tap, -t          Generate TAP output',
	'  --verbose, -v      Enable verbose output',
	'  --no-cache         Disable the transpiler cache',
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
		'require',
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
		'watch',
		'browser'
	],
	default: conf,
	alias: {
		t: 'tap',
		v: 'verbose',
		r: 'require',
		s: 'serial',
		m: 'match',
		w: 'watch',
		S: 'source',
		T: 'timeout',
		c: 'concurrency',
		b: 'browser'
	}
});

updateNotifier({pkg: cli.pkg}).notify();

if (cli.flags.init) {
	require('ava-init')();
	return;
}

if (
	(hasFlag('--watch') || hasFlag('-w')) && (hasFlag('--tap') || hasFlag('-t')) ||
	conf.watch && conf.tap
) {
	console.error('  ' + colors.error(figures.cross) + ' The TAP reporter is not available when using watch mode.');
	process.exit(1);
}

var patterns = cli.input.length ? cli.input : arrify(conf.files);
var files = new AvaFiles(patterns)
	.findTestFilesSync();

if (cli.flags.browser) {
	var browserify = require('browserify');

	var cacheDirPath = findCacheDir({name: 'ava', files: files}) || uniqueTempDir();
	var precompiler = new CachingPrecompiler(cacheDirPath, cli.flags.babelConfig);

	function precompile (file) {
		if (files.indexOf(file) < 0) {
			return through();
		}

		precompiler.precompileFile(file);

		var hash = precompiler.fileHashes[file];
		var path = __dirname + '/node_modules/.cache/ava/' + hash + '.js';

		var fileStream = fs.createReadStream(path);
		var transformStream = through(function () {}, function () {});

		fileStream.on('data', function (data) {
			transformStream.queue(data);
		});

		fileStream.on('end', function () {
			transformStream.queue(null);
		});

		return transformStream;
	}

	var state = {
		files: files,
		conf: conf,
		cli: cli
	};

	var statePath = cacheDirPath + '/state.json';
	fs.writeFileSync(statePath, JSON.stringify(state), 'utf8');

	var browserBundle = browserify(['browser.js'], {
		fullPaths: true,
		insertGlobals: true
	});

	browserBundle.require(statePath, { expose: './state' });

	var browserStream = fs.createWriteStream('tests.js');
	browserBundle.bundle().pipe(browserStream);

	var workerBundle = browserify(['lib/browser-test-worker.js'], {
		fullPaths: true,
		insertGlobals: true
	});

	workerBundle.transform(precompile);
	workerBundle.require(arrify(cli.flags.require));
	workerBundle.require(files);

	var workerStream = fs.createWriteStream('test-worker.js');
	workerBundle.bundle().pipe(workerStream);

	return;
}

var api = new Api({
	failFast: cli.flags.failFast,
	serial: cli.flags.serial,
	require: arrify(cli.flags.require),
	cacheEnabled: cli.flags.cache !== false,
	explicitTitles: cli.flags.watch,
	match: arrify(cli.flags.match),
	babelConfig: conf.babel,
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

if (cli.flags.watch) {
	try {
		var watcher = new Watcher(logger, api, patterns, arrify(cli.flags.source));
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
