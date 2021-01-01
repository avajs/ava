'use strict';
const path = require('path');
const del = require('del');
const updateNotifier = require('update-notifier');
const figures = require('figures');
const arrify = require('arrify');
const yargs = require('yargs');
const readPkg = require('read-pkg');
const isCi = require('./is-ci');
const {loadConfig} = require('./load-config');

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
		description: 'Max number of test files running at the same time (default: CPU cores)',
		type: 'number'
	},
	'fail-fast': {
		coerce: coerceLastValue,
		description: 'Stop after first test failure',
		type: 'boolean'
	},
	match: {
		alias: 'm',
		description: 'Only run tests with matching title (can be repeated)',
		type: 'string'
	},
	'node-arguments': {
		coerce: coerceLastValue,
		description: 'Additional Node.js arguments for launching worker processes (specify as a single string)',
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
		conf = await loadConfig({configFile});
	} catch (error) {
		confError = error;
	}

	// Enter debug mode if the main process is being inspected. This assumes the
	// worker processes are automatically inspected, too. It is not necessary to
	// run AVA with the debug command, though it's allowed.
	const activeInspector = require('inspector').url() !== undefined; // eslint-disable-line node/no-unsupported-features/node-builtins
	let debug = activeInspector ?
		{
			active: true,
			break: false,
			files: [],
			host: undefined,
			port: undefined
		} : null;

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
		.usage('$0 [<pattern>...]')
		.usage('$0 debug [<pattern>...]')
		.usage('$0 reset-cache')
		.options({
			color: {
				description: 'Force color output',
				type: 'boolean'
			},
			config: {
				description: 'Specific JavaScript file for AVA to read its config from, instead of using package.json or ava.config.* files'
			}
		})
		.command('* [<pattern>...]', 'Run tests', yargs => yargs.options(FLAGS).positional('pattern', {
			array: true,
			describe: 'Glob patterns to select what test files to run. Leave empty if you want AVA to run all test files instead. Add a colon and specify line numbers of specific tests to run',
			type: 'string'
		}), argv => {
			if (activeInspector) {
				debug.files = argv.pattern || [];
			}
		})
		.command(
			'debug [<pattern>...]',
			'Activate Node.js inspector and run a single test file',
			yargs => yargs.options(FLAGS).options({
				break: {
					description: 'Break before the test file is loaded',
					type: 'boolean'
				},
				host: {
					default: '127.0.0.1',
					description: 'Address or hostname through which you can connect to the inspector',
					type: 'string'
				},
				port: {
					default: 9229,
					description: 'Port on which you can connect to the inspector',
					type: 'number'
				}
			}).positional('pattern', {
				demand: true,
				describe: 'Glob patterns to select a single test file to debug. Add a colon and specify line numbers of specific tests to run',
				type: 'string'
			}),
			argv => {
				debug = {
					active: activeInspector,
					break: argv.break === true,
					files: argv.pattern,
					host: argv.host,
					port: argv.port
				};
			})
		.command(
			'reset-cache',
			'Reset AVA’s compilation cache and exit',
			yargs => yargs,
			() => {
				resetCache = true;
			})
		.example('$0')
		.example('$0 test.js')
		.example('$0 test.js:4,7-9')
		.help();

	const combined = {...conf};
	for (const flag of Object.keys(FLAGS)) {
		if (Reflect.has(argv, flag)) {
			if (flag === 'fail-fast') {
				combined.failFast = argv[flag];
			} else if (flag === 'update-snapshots') {
				combined.updateSnapshots = argv[flag];
			} else if (flag !== 'node-arguments') {
				combined[flag] = argv[flag];
			}
		}
	}

	const chalkOptions = {level: combined.color === false ? 0 : require('chalk').level};
	const chalk = require('./chalk').set(chalkOptions);

	if (combined.updateSnapshots && combined.match) {
		exit('Snapshots cannot be updated when matching specific tests.');
	}

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

		if (combined.timeout) {
			console.log(chalk.magenta(`  ${figures.warning} The timeout option has been disabled to help with debugging.`));
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
		exit('AVA no longer compiles helpers. Add exclusion patterns to the ’files’ configuration and specify ’compileAsTests’ in the Babel options instead.');
	}

	if (Reflect.has(conf, 'sources')) {
		exit('’sources’ has been removed. Use ’ignoredByWatcher’ to provide glob patterns of files that the watcher should ignore.');
	}

	const ciParallelVars = require('ci-parallel-vars');
	const Api = require('./api');
	const DefaultReporter = require('./reporters/default');
	const TapReporter = require('./reporters/tap');
	const Watcher = require('./watcher');
	const normalizeExtensions = require('./extensions');
	const normalizeModuleTypes = require('./module-types');
	const {normalizeGlobs, normalizePattern} = require('./globs');
	const normalizeNodeArguments = require('./node-arguments');
	const validateEnvironmentVariables = require('./environment-variables');
	const {splitPatternAndLineNumbers} = require('./line-numbers');
	const providerManager = require('./provider-manager');

	let pkg;
	try {
		pkg = readPkg.sync({cwd: projectDir});
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}

	const {type: defaultModuleType = 'commonjs'} = pkg || {};

	const providers = [];
	if (Reflect.has(conf, 'babel')) {
		try {
			const {level, main} = providerManager.babel(projectDir);
			providers.push({
				level,
				main: main({config: conf.babel}),
				type: 'babel'
			});
		} catch (error) {
			exit(error.message);
		}
	}

	if (Reflect.has(conf, 'typescript')) {
		try {
			const {level, main} = providerManager.typescript(projectDir);
			providers.push({
				level,
				main: main({config: conf.typescript}),
				type: 'typescript'
			});
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
		extensions = normalizeExtensions(conf.extensions, providers);
	} catch (error) {
		exit(error.message);
	}

	let moduleTypes;
	try {
		moduleTypes = normalizeModuleTypes(conf.extensions, defaultModuleType, experiments);
	} catch (error) {
		exit(error.message);
	}

	let globs;
	try {
		globs = normalizeGlobs({files: conf.files, ignoredByWatcher: conf.ignoredByWatcher, extensions, providers});
	} catch (error) {
		exit(error.message);
	}

	let nodeArguments;
	try {
		nodeArguments = normalizeNodeArguments(conf.nodeArguments, argv['node-arguments']);
	} catch (error) {
		exit(error.message);
	}

	let parallelRuns = null;
	if (isCi && ciParallelVars) {
		const {index: currentIndex, total: totalRuns} = ciParallelVars;
		parallelRuns = {currentIndex, totalRuns};
	}

	const match = combined.match === '' ? [] : arrify(combined.match);

	const input = debug ? debug.files : (argv.pattern || []);
	const filter = input
		.map(pattern => splitPatternAndLineNumbers(pattern))
		.map(({pattern, ...rest}) => ({
			pattern: normalizePattern(path.relative(projectDir, path.resolve(process.cwd(), pattern))),
			...rest
		}));
	if (combined.updateSnapshots && filter.some(condition => condition.lineNumbers !== null)) {
		exit('Snapshots cannot be updated when selecting specific tests by their line number.');
	}

	const api = new Api({
		cacheEnabled: combined.cache !== false,
		chalkOptions,
		concurrency: combined.concurrency || 0,
		debug,
		environmentVariables,
		experiments,
		extensions,
		failFast: combined.failFast,
		failWithoutAssertions: combined.failWithoutAssertions !== false,
		globs,
		match,
		moduleTypes,
		nodeArguments,
		parallelRuns,
		projectDir,
		providers,
		ranFromCli: true,
		require: arrify(combined.require),
		serial: combined.serial,
		snapshotDir: combined.snapshotDir ? path.resolve(projectDir, combined.snapshotDir) : null,
		timeout: combined.timeout || '10s',
		updateSnapshots: combined.updateSnapshots,
		workerArgv: argv['--']
	});

	const reporter = combined.tap && !combined.watch && debug === null ? new TapReporter({
		projectDir,
		reportStream: process.stdout,
		stdStream: process.stderr
	}) : new DefaultReporter({
		projectDir,
		reportStream: process.stdout,
		stdStream: process.stderr,
		watching: combined.watch,
		verbose: debug !== null || combined.verbose || isCi || !process.stdout.isTTY
	});

	api.on('run', plan => {
		reporter.startRun(plan);

		if (process.env.AVA_EMIT_RUN_STATUS_OVER_IPC === 'I\'ll find a payphone baby / Take some time to talk to you') {
			const {controlFlow} = require('./ipc-flow-control');
			const bufferedSend = controlFlow(process);

			if (process.versions.node >= '12.16.0') {
				plan.status.on('stateChange', evt => {
					bufferedSend(evt);
				});
			} else {
				const v8 = require('v8');
				plan.status.on('stateChange', evt => {
					bufferedSend([...v8.serialize(evt)]);
				});
			}
		}

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
			filter,
			globs,
			projectDir,
			providers,
			reporter
		});
		watcher.observeStdin(process.stdin);
	} else {
		let debugWithoutSpecificFile = false;
		api.on('run', plan => {
			if (debug !== null && plan.files.length !== 1) {
				debugWithoutSpecificFile = true;
			}
		});

		const runStatus = await api.run({filter});

		if (debugWithoutSpecificFile && !debug.active) {
			exit('Provide the path to the test file you wish to debug');
			return;
		}

		process.exitCode = runStatus.suggestExitCode({matching: match.length > 0});
		reporter.endRun();
	}
};
