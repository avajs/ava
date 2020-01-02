'use strict';
const path = require('path');
const fs = require('fs');
const del = require('del');
const updateNotifier = require('update-notifier');
const figures = require('figures');
const arrify = require('arrify');
const yargs = require('yargs');
const Promise = require('bluebird');
const isCi = require('is-ci');
const loadConfig = require('./load-config');

// Bluebird specific
Promise.longStackTraces();

function exit(message) {
	console.error(`\n  ${require('./chalk').get().red(figures.cross)} ${message}`);
	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

const coerceLastValue = value => {
	return Array.isArray(value) ? value.pop() : value;
};

const FLAGS = {
	concurrency: {
		alias: 'c',
		coerce: coerceLastValue,
		description: 'Max number of test files running at the same time (Default: CPU cores)',
		type: 'number'
	},
	'fail-fast': {
		coerce: coerceLastValue,
		description: 'Stop after first test failure',
		type: 'boolean'
	},
	match: {
		alias: 'm',
		description: 'Only run tests with matching title (Can be repeated)',
		type: 'string'
	},
	serial: {
		alias: 's',
		coerce: coerceLastValue,
		description: 'Run tests serially',
		type: 'boolean'
	},
	tap: {
		alias: 't',
		coerce: coerceLastValue,
		description: 'Generate TAP output',
		type: 'boolean'
	},
	timeout: {
		alias: 'T',
		coerce: coerceLastValue,
		description: 'Set global timeout (milliseconds or human-readable, e.g. 10s, 2m)',
		type: 'string'
	},
	'update-snapshots': {
		alias: 'u',
		coerce: coerceLastValue,
		description: 'Update snapshots',
		type: 'boolean'
	},
	verbose: {
		alias: 'v',
		coerce: coerceLastValue,
		description: 'Enable verbose output',
		type: 'boolean'
	},
	watch: {
		alias: 'w',
		coerce: coerceLastValue,
		description: 'Re-run tests when files change',
		type: 'boolean'
	}
};

exports.run = async () => { // eslint-disable-line complexity
	let conf = {};
	let confError = null;
	try {
		const {argv: {config: configFile}} = yargs.help(false);
		conf = loadConfig({configFile});
	} catch (error) {
		confError = error;
	}

	let debug = null;
	let resetCache = false;
	const {argv} = yargs
		.parserConfiguration({
			'boolean-negation': true,
			'camel-case-expansion': false,
			'combine-arrays': false,
			'dot-notation': false,
			'duplicate-arguments-array': true,
			'flatten-duplicate-arrays': true,
			'negation-prefix': 'no-',
			'parse-numbers': true,
			'populate--': true,
			'set-placeholder-key': false,
			'short-option-groups': true,
			'strip-aliased': true,
			'unknown-options-as-args': false
		})
		.usage('$0 <files>')
		.usage('$0 debug <file>')
		.usage('$0 reset-cache')
		.options({
			color: {
				description: 'Force color output',
				type: 'boolean'
			},
			config: {
				description: 'JavaScript file for AVA to read its config from, instead of using package.json or ava.config.js files'
			}
		})
		.command('*', 'Run tests', yargs => yargs.options(FLAGS).positional('files', {
			array: true,
			describe: 'Paths to individual test files. Leave empty if you want AVA to search for files instead.',
			type: 'string'
		}))
		.command(
			'debug',
			'Activate Node.js inspector and run the test file',
			yargs => yargs.options(FLAGS).options({
				break: {
					description: 'Break before the test file is loaded',
					type: 'boolean'
				},
				port: {
					default: 9229,
					description: 'Port on which you can connect to the inspector',
					type: 'number'
				}
			}).positional('file', {
				demand: true,
				describe: 'Path to an individual test file',
				type: 'string'
			}),
			argv => {
				debug = {
					break: argv.break === true,
					files: argv._.slice(1),
					port: argv.port
				};
			})
		.command(
			'reset-cache',
			'Reset AVA\'s compilation cache and exit',
			yargs => yargs,
			() => {
				resetCache = true;
			})
		.example('$0')
		.example('$0 test.js')
		.help();

	const combined = {...conf};
	for (const flag of Object.keys(FLAGS)) {
		if (Reflect.has(argv, flag)) {
			if (flag === 'fail-fast') {
				combined.failFast = argv[flag];
			} else if (flag === 'update-snapshots') {
				combined.updateSnaphots = argv[flag];
			} else {
				combined[flag] = argv[flag];
			}
		}
	}

	const chalk = require('./chalk').set({level: combined.color === false ? 0 : require('chalk').level});

	if (confError) {
		if (confError.parent) {
			exit(`${confError.message}\n\n${chalk.gray((confError.parent && confError.parent.stack) || confError.parent)}`);
		} else {
			exit(confError.message);
		}
	}

	updateNotifier({pkg: require('../package.json')}).notify();

	const {nonSemVerExperiments: experiments, projectDir} = conf;
	if (resetCache) {
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

	if (argv.watch) {
		if (argv.tap && !conf.tap) {
			exit('The TAP reporter is not available when using watch mode.');
		}

		if (isCi) {
			exit('Watch mode is not available in CI, as it prevents AVA from terminating.');
		}

		if (debug !== null) {
			exit('Watch mode is not available when debugging.');
		}
	}

	if (debug !== null) {
		if (argv.tap && !conf.tap) {
			exit('The TAP reporter is not available when debugging.');
		}

		if (isCi) {
			exit('Debugging is not available in CI.');
		}
	}

	if (Reflect.has(combined, 'concurrency') && (!Number.isInteger(combined.concurrency) || combined.concurrency < 0)) {
		exit('The --concurrency or -c flag must be provided with a nonnegative integer.');
	}

	if (!combined.tap && Object.keys(experiments).length > 0) {
		console.log(chalk.magenta(`  ${figures.warning} Experiments are enabled. These are unsupported and may change or be removed at any time.`));
	}

	if (Reflect.has(conf, 'compileEnhancements')) {
		exit('Enhancement compilation must be configured in AVA’s Babel options.');
	}

	if (Reflect.has(conf, 'helpers')) {
		exit('AVA no longer compiles helpers. Add exclusion patterns to the \'files\' configuration and specify \'compileAsTests\' in the Babel options instead.');
	}

	if (Reflect.has(conf, 'sources')) {
		exit('\'sources\' has been removed. Use \'ignoredByWatcher\' to provide glob patterns of files that the watcher should ignore.');
	}

	const ciParallelVars = require('ci-parallel-vars');
	const Api = require('./api');
	const VerboseReporter = require('./reporters/verbose');
	const MiniReporter = require('./reporters/mini');
	const TapReporter = require('./reporters/tap');
	const Watcher = require('./watcher');
	const babelManager = require('./babel-manager');
	const normalizeExtensions = require('./extensions');
	const {normalizeGlobs} = require('./globs');
	const validateEnvironmentVariables = require('./environment-variables');

	let babelProvider;
	if (Reflect.has(conf, 'babel')) {
		try {
			babelProvider = babelManager({projectDir}).main({config: conf.babel});
		} catch (error) {
			exit(error.message);
		}
	}

	let environmentVariables;
	try {
		environmentVariables = validateEnvironmentVariables(conf.environmentVariables);
	} catch (error) {
		exit(error.message);
	}

	let extensions;
	try {
		extensions = normalizeExtensions(conf.extensions, babelProvider);
	} catch (error) {
		exit(error.message);
	}

	let globs;
	try {
		globs = normalizeGlobs({files: conf.files, ignoredByWatcher: conf.ignoredByWatcher, extensions});
	} catch (error) {
		exit(error.message);
	}

	let parallelRuns = null;
	if (isCi && ciParallelVars) {
		const {index: currentIndex, total: totalRuns} = ciParallelVars;
		parallelRuns = {currentIndex, totalRuns};
	}

	const match = combined.match === '' ? [] : arrify(combined.match);

	const input = debug ? debug.files : argv._;
	const resolveTestsFrom = input.length === 0 ? projectDir : process.cwd();
	const files = input.map(file => path.relative(resolveTestsFrom, path.resolve(process.cwd(), file)));

	for (const file of files) {
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

	if (debug !== null && files.length !== 1) {
		exit('Provide the path to the test file you wish to debug');
	}

	const api = new Api({
		babelProvider,
		cacheEnabled: combined.cache !== false,
		color: combined.color,
		concurrency: combined.concurrency || 0,
		debug,
		experiments,
		extensions,
		failFast: combined.failFast,
		failWithoutAssertions: combined.failWithoutAssertions !== false,
		globs,
		environmentVariables,
		match,
		parallelRuns,
		projectDir,
		ranFromCli: true,
		require: arrify(combined.require),
		resolveTestsFrom,
		serial: combined.serial,
		snapshotDir: combined.snapshotDir ? path.resolve(projectDir, combined.snapshotDir) : null,
		timeout: combined.timeout,
		updateSnapshots: combined.updateSnapshots,
		workerArgv: argv['--']
	});

	let reporter;
	if (combined.tap && !combined.watch && debug === null) {
		reporter = new TapReporter({
			reportStream: process.stdout,
			stdStream: process.stderr
		});
	} else if (debug !== null || combined.verbose || isCi || !process.stdout.isTTY) {
		reporter = new VerboseReporter({
			reportStream: process.stdout,
			stdStream: process.stderr,
			watching: combined.watch
		});
	} else {
		reporter = new MiniReporter({
			reportStream: process.stdout,
			stdStream: process.stderr,
			watching: combined.watch
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

	if (combined.watch) {
		const watcher = new Watcher({
			api,
			reporter,
			files,
			globs,
			projectDir,
			babelProvider
		});
		watcher.observeStdin(process.stdin);
	} else {
		const runStatus = await api.run(files);
		process.exitCode = runStatus.suggestExitCode({matching: match.length > 0});
		reporter.endRun();
	}
};
