import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {stripVTControlCharacters} from 'node:util';
import v8 from 'node:v8';

import arrify from 'arrify';
import {supportsColor, supportsColorStderr as shouldStripVTForStderr} from 'chalk'; // eslint-disable-line unicorn/import-style
import figures from 'figures';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {asyncEventIteratorFromApi} from './api-event-iterator.js';
import Api from './api.js';
import {chalk, set as setChalk} from './chalk.js';
import validateEnvironmentVariables from './environment-variables.js';
import normalizeExtensions from './extensions.js';
import {normalizeGlobs, normalizePattern} from './globs.js';
import isCi from './is-ci.js';
import {splitPatternAndLineNumbers} from './line-numbers.js';
import {loadConfig} from './load-config.js';
import normalizeNodeArguments from './node-arguments.js';
import pkg from './pkg.js';

const coerceLastValue = value => Array.isArray(value) ? value.pop() : value;

const BUNDLED_PLUGINS = [{namespace: 'tap', filename: new URL('plugin-support/tap-plugin.js', import.meta.url)}];
const TAP_ACTIVATION = {
	alias: 't', coerce: coerceLastValue, description: 'Generate TAP output', type: 'boolean',
};

const FLAGS = {
	concurrency: {
		alias: 'c',
		coerce: coerceLastValue,
		description: 'Max number of test files running at the same time (default: CPU cores)',
		type: 'number',
	},
	'fail-fast': {
		coerce: coerceLastValue,
		description: 'Stop after first test failure',
		type: 'boolean',
	},
	match: {
		alias: 'm',
		description: 'Only run tests with matching title (can be repeated)',
		type: 'string',
	},
	'no-worker-threads': {
		coerce: coerceLastValue,
		description: 'Don\'t use worker threads',
		type: 'boolean',
	},
	'node-arguments': {
		coerce: coerceLastValue,
		description: 'Additional Node.js arguments for launching worker processes (specify as a single string)',
		type: 'string',
	},
	serial: {
		alias: 's',
		coerce: coerceLastValue,
		description: 'Run tests serially',
		type: 'boolean',
	},
	timeout: {
		alias: 'T',
		coerce: coerceLastValue,
		description: 'Set global timeout (milliseconds or human-readable, e.g. 10s, 2m)',
		type: 'string',
	},
	'update-snapshots': {
		alias: 'u',
		coerce: coerceLastValue,
		description: 'Update snapshots',
		type: 'boolean',
	},
	verbose: {
		alias: 'v',
		coerce: coerceLastValue,
		description: 'Enable verbose output (default)',
		type: 'boolean',
	},
	watch: {
		alias: 'w',
		coerce: coerceLastValue,
		description: 'Re-run tests when files change',
		type: 'boolean',
	},
};

const checkInspector = async () => {
	try {
		const {default: inspector} = await import('node:inspector');
		return inspector.url() !== undefined;
	} catch {
		return false;
	}
};

export default async function loadCli() { // eslint-disable-line complexity
	// We'll enter debug mode if the main process is being inspected. This assumes the worker processes are automatically
	// inspected, too. It is not necessary to run AVA with the debug command, though it's allowed.
	const checkingInspector = checkInspector();

	// MARK: Notice management and exit handler
	const notices = [];
	const notice = (code, message = '', level = 'info') => {
		notices.push({code, message, level});
	};

	const renderNotices = (shouldRedirectToStderr = false) => {
		const stream = shouldRedirectToStderr ? process.stderr : process.stdout;
		const transform = shouldRedirectToStderr && shouldStripVTForStderr ? stripVTControlCharacters : undefined;
		for (const {message} of notices.splice(0)) {
			stream.write(`${transform?.(message) ?? message}\n`);
		}
	};

	const exit = message => {
		renderNotices(true);
		console.error(`\n  ${chalk.red(figures.cross)} ${message}`);
		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	};

	// MARK: Parse preliminary CLI arguments before we're ready to load the full configuration
	const args = hideBin(process.argv);
	const preliminary = yargs(args).help(false).version(false)
		.parserConfiguration({'camel-case-expansion': false})
		.options({
			tap: TAP_ACTIVATION,
			color: {type: 'boolean'},
			config: {type: 'string'},
			watch: FLAGS.watch,
			help: {type: 'boolean'},
			version: {type: 'boolean'},
		})
		.parseSync();

	// MARK: Determine chalk options based on color support
	const chalkOptions = {level: preliminary.color === false ? 0 : (supportsColor ? supportsColor.level : 0)};
	setChalk(chalkOptions);

	// MARK: Load configuration file
	let conf;
	try {
		const loaded = await loadConfig({configFile: preliminary.config});
		const configuredColor = preliminary.color ?? loaded.config.color;
		chalkOptions.level = configuredColor === false ? 0 : (supportsColor ? supportsColor.level : 0);
		setChalk(chalkOptions);

		if (loaded.unsupportedFiles.length > 0) {
			notice('unsupported-config-files', chalk.magenta(`  ${figures.warning} AVA does not support JSON config, ignoring:\n\n    ${loaded.unsupportedFiles.join('\n    ')}`));
		}

		conf = loaded.config;
		if (conf.configFile && path.basename(conf.configFile) !== path.relative(conf.projectDir, conf.configFile)) {
			notice('config-file', chalk.magenta(`  ${figures.warning} Using configuration from ${conf.configFile}`));
		}
	} catch (error) {
		if (error && !preliminary.help && !preliminary.version) {
			exit(error.cause ? `${error.message}\n\n${chalk.gray(error.cause?.stack ?? error.cause)}` : error.message);
		}
	}

	// MARK: Select and negotiate plugins based on preliminary arguments and configuration
	const beforeSeparator = args.slice(0, args.includes('--') ? args.indexOf('--') : args.length);
	const selected = BUNDLED_PLUGINS.filter(({namespace}) =>
		Boolean(preliminary[namespace] ?? conf?.[namespace])
		|| beforeSeparator.some(argument => argument.startsWith(`--${namespace}-`) || argument.startsWith(`--no-${namespace}-`)));

	let plugins;
	let pluginFlags = {};
	if (selected.length > 0 && !preliminary.version && preliminary._[0] !== 'reset-cache') {
		const {default: ReporterHost} = await import('./plugin-support/reporter-host.js');
		plugins = new ReporterHost({
			plugins: selected.map(plugin => ({...plugin, options: conf?.[plugin.namespace]})),
			projectDir: conf?.projectDir,
			colorLevel: chalkOptions.level,
			reservedFlags: [...Object.keys(FLAGS), ...Object.values(FLAGS).flatMap(flag => flag.alias ?? []), 'worker-threads', 'color', 'config', 'help', 'version', 'break', 'host', 'port'],
			debug: preliminary._[0] === 'debug' || await checkingInspector,
		});
		try {
			pluginFlags = await plugins.negotiate();
		} catch (error) {
			await plugins.close();
			exit(error.message);
		}
	}

	const commandFlags = {
		...FLAGS,
		'worker-threads': {type: 'boolean', hidden: true, coerce: coerceLastValue},
		tap: TAP_ACTIVATION,
		...Object.fromEntries(Object.entries(pluginFlags).map(([name, definition]) => [
			name, {...definition, coerce: coerceLastValue, ...((name === 'tap') && {alias: 't'})},
		])),
	};

	// MARK: Load final flags
	const hasActiveInspector = await checkingInspector;
	let debug = hasActiveInspector
		? {
			active: true,
			break: false,
			files: [],
			host: undefined,
			port: undefined,
		}
		: null;

	let isResetCache = false;

	const {argv} = yargs(hideBin(process.argv))
		.scriptName('ava')
		.version(pkg.version)
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
			'unknown-options-as-args': false,
		})
		.usage('$0 [<pattern>...]')
		.usage('$0 debug [<pattern>...]')
		.usage('$0 reset-cache')
		.options({
			color: {
				description: 'Force color output',
				type: 'boolean',
			},
			config: {
				description: 'Specific JavaScript file for AVA to read its config from, instead of using package.json or ava.config.* files',
			},
		})
		.command('* [<pattern>...]', 'Run tests', commandBuilder => commandBuilder.options(commandFlags).positional('pattern', {
			array: true,
			// eslint-disable-next-line @stylistic/max-len
			describe: 'Select which test files to run. Leave empty if you want AVA to run all test files as per your configuration. Accepts glob patterns, directories that (recursively) contain test files, and file paths optionally suffixed with a colon and comma-separated numbers and/or ranges identifying the 1-based line(s) of specific tests to run',
			type: 'string',
		}), argv => {
			if (debug) {
				debug.files = argv.pattern ?? [];
			}
		})
		.command(
			'debug [<pattern>...]',
			'Activate Node.js inspector and run a single test file',
			commandBuilder => commandBuilder.options(commandFlags).options({
				break: {
					description: 'Break before the test file is loaded',
					type: 'boolean',
				},
				host: {
					default: '127.0.0.1',
					description: 'Address or hostname through which you can connect to the inspector',
					type: 'string',
				},
				port: {
					default: 9229,
					description: 'Port on which you can connect to the inspector',
					type: 'number',
				},
			}).positional('pattern', {
				demand: true,
				// eslint-disable-next-line @stylistic/max-len
				describe: 'Glob pattern to select a single test file to debug, optionally suffixed with a colon and comma-separated numbers and/or ranges identifying the 1-based line(s) of specific tests to run',
				type: 'string',
			}),
			argv => {
				debug = {
					active: hasActiveInspector,
					break: argv.break === true,
					files: argv.pattern,
					host: argv.host,
					port: argv.port,
				};
			},
		)
		.command(
			'reset-cache',
			'Delete any temporary files and state kept by AVA, then exit',
			commandBuilder => commandBuilder,
			() => {
				isResetCache = true;
			},
		)
		.example('$0')
		.example('$0 test.js')
		.example('$0 test.js:4,7-9')
		.strictOptions()
		.fail(message => exit(message))
		.help();

	const combined = {...conf};
	for (const flag of Object.keys(FLAGS)) {
		if (flag === 'no-worker-threads' && Object.hasOwn(argv, 'worker-threads')) {
			combined.workerThreads = argv['worker-threads'];
			continue;
		}

		if (argv[flag] !== undefined) {
			if (flag === 'fail-fast') {
				combined.failFast = argv[flag];
			} else if (flag === 'update-snapshots') {
				combined.updateSnapshots = argv[flag];
			} else if (flag !== 'node-arguments') {
				combined[flag] = argv[flag];
			}
		}
	}

	const {nonSemVerExperiments: experiments, projectDir} = conf;

	// MARK: Execute reset cache command
	if (isResetCache) {
		const cacheDir = path.join(projectDir, 'node_modules', '.cache', 'ava');
		try {
			let entries;
			try {
				entries = fs.readdirSync(cacheDir);
			} catch (error) {
				if (error.code === 'ENOENT') {
					entries = [];
				} else {
					throw error;
				}
			}

			for (const entry of entries) {
				fs.rmSync(path.join(cacheDir, entry), {recursive: true, force: true});
			}

			if (entries.length === 0) {
				console.log(`\n${chalk.green(figures.tick)} No cache files to remove`);
			} else {
				console.log(`\n${chalk.green(figures.tick)} Removed AVA cache files in ${cacheDir}`);
			}

			process.exit(0); // eslint-disable-line unicorn/no-process-exit
		} catch (error) {
			exit(`Error removing AVA cache files in ${cacheDir}\n\n${chalk.gray(error?.stack ?? error)}`);
		}
	}

	// MARK: Configure plugins
	if (plugins) {
		try {
			const diagnostics = await plugins.configure({flags: argv, mode: {watch: Boolean(argv.watch), debug: debug !== null}});
			for (const diagnostic of diagnostics) {
				notice('plugin-warning', diagnostic.message, diagnostic.level);
			}

			if (!plugins.active) {
				await plugins.close();
				plugins = undefined;
			}
		} catch (error) {
			for (const diagnostic of plugins.diagnostics) {
				if (diagnostic.level !== 'warning') {
					continue;
				}

				notice('plugin-warning', diagnostic.message, diagnostic.level);
			}

			await plugins.close();
			exit(error.message);
		}
	}

	// MARK: Final configuration and flag validation
	if (argv.watch) {
		if (isCi) {
			exit('Watch mode is not available in CI, as it prevents AVA from terminating.');
		}

		if (debug !== null && !process.env.TEST_AVA) {
			exit('Watch mode is not available when debugging.');
		}
	}

	if (debug !== null) {
		if (isCi) {
			exit('Debugging is not available in CI.');
		}

		if (combined.timeout) {
			notice('debug-timeout-disabled', chalk.magenta(`  ${figures.warning} The timeout option has been disabled to help with debugging.`));
		}
	}

	if (Object.hasOwn(combined, 'concurrency') && (!Number.isSafeInteger(combined.concurrency) || combined.concurrency < 0)) {
		exit('The --concurrency or -c flag must be provided with a non-negative integer.');
	}

	if (Object.hasOwn(conf, 'sortTestFiles') && typeof conf.sortTestFiles !== 'function') {
		exit('’sortTestFiles’ must be a comparator function.');
	}

	if (Object.hasOwn(conf, 'watch')) {
		exit('’watch’ must not be configured, use the --watch CLI flag instead.');
	}

	if (Object.hasOwn(conf, 'ignoredByWatcher')) {
		exit('’ignoredByWatcher’ has moved to ’watchMode.ignoreChanges’.');
	}

	if (Object.keys(experiments).length > 0) {
		notice('experiments-enabled', chalk.magenta(`  ${figures.warning} Experiments are enabled. These are unsupported and may change or be removed at any time.`));
	}

	// MARK: Render notices
	renderNotices(plugins?.claimsStdout);

	// MARK: Load providers
	const providers = [];
	if (Object.hasOwn(conf, 'typescript')) {
		const {default: providerManager} = await import('./provider-manager.js');
		try {
			const {identifier: protocol, level, main} = await providerManager.typescript(projectDir);
			providers.push({
				level,
				protocol,
				main: main({config: conf.typescript}),
				type: 'typescript',
			});
		} catch (error) {
			exit(error.message);
		}
	}

	// MARK: Normalize configuration
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

	let globs;
	try {
		globs = normalizeGlobs({
			files: conf.files, ignoredByWatcher: conf.watchMode?.ignoreChanges, extensions, providers,
		});
	} catch (error) {
		exit(error.message);
	}

	const isWorkerThreadsEnabled = combined.workerThreads !== false;

	let nodeArguments;
	try {
		nodeArguments = normalizeNodeArguments(conf.nodeArguments, argv['node-arguments'], conf.explicitlyForwardNodeArguments !== false);
		// TODO: Remove `filterNodeArgumentsForWorkerThreads` in the next major release.
		if (isWorkerThreadsEnabled && 'filterNodeArgumentsForWorkerThreads' in conf) {
			const {filterNodeArgumentsForWorkerThreads: filter} = conf;
			nodeArguments = nodeArguments.filter(argument => filter(argument));
		}
	} catch (error) {
		exit(error.message);
	}

	const match = combined.match === '' ? [] : arrify(combined.match);

	// MARK: Determine parallel runs in CI environment
	let parallelRuns = null;
	if (isCi && combined.utilizeParallelBuilds !== false) {
		const {default: ciParallelVars} = await import('ci-parallel-vars');
		if (ciParallelVars) {
			const {index: currentIndex, total: totalRuns} = ciParallelVars;
			parallelRuns = {currentIndex, totalRuns};
		}
	}

	// MARK: Run AVA
	const input = debug ? debug.files : (argv.pattern ?? []);
	const cwd = process.cwd();
	const filter = input
		.map(pattern => splitPatternAndLineNumbers(pattern))
		.map(({pattern, ...rest}) => ({
			pattern: normalizePattern(path.relative(projectDir, path.resolve(cwd, pattern))),
			...rest,
		}));

	const api = new Api({
		cacheEnabled: combined.cache !== false,
		chalkOptions,
		concurrency: combined.concurrency ?? 0,
		workerThreads: combined.workerThreads !== false,
		debug,
		environmentVariables,
		experiments,
		extensions,
		failFast: combined.failFast,
		failWithoutAssertions: combined.failWithoutAssertions !== false,
		globs,
		match,
		nodeArguments,
		parallelRuns,
		sortTestFiles: conf.sortTestFiles,
		projectDir,
		providers,
		ranFromCli: true,
		require: arrify(combined.require),
		serial: combined.serial,
		snapshotDir: combined.snapshotDir ? path.resolve(projectDir, combined.snapshotDir) : null,
		timeout: combined.timeout ?? '10s',
		updateSnapshots: combined.updateSnapshots,
		workerArgv: argv['--'],
	});

	let reporter;
	if (!plugins?.claimsStdout) {
		const {default: Reporter} = await import('./reporters/default.js');
		reporter = new Reporter({
			extensions: globs.extensions,
			projectDir,
			reportStream: process.stdout,
			stdStream: process.stderr,
			watching: argv.watch,
		});
	}

	let currentPlan;
	let runId = 0;
	let finishing;
	let isAborting = false;
	let reportedError;
	const messages = plugins ? await import('./plugin-support/run-messages.js') : undefined;
	const completeRun = async (reason, exitCode) => {
		reporter?.endRun();
		if (!plugins) {
			return;
		}

		try {
			await plugins.finish(messages.runEnd(currentPlan, runId, reason, exitCode), {interrupted: reason === 'interrupted'});
		} catch (error) {
			if (error !== reportedError) {
				console.error(error.message);
			}

			process.exitCode = 1;
		}

		if (plugins.flushTimedOut) {
			process.exit(process.exitCode ?? exitCode); // eslint-disable-line unicorn/no-process-exit
		}
	};

	const finish = (reason, exitCode) => {
		finishing ??= completeRun(reason, exitCode);
		return finishing;
	};

	if (process.env.TEST_AVA) {
		const {controlFlow} = await import('./ipc-flow-control.js');
		const bufferedSend = controlFlow(process);

		api.on('run', ({data: plan}) => {
			if (isAborting) {
				return;
			}

			plan.status.on('stateChange', ({data: evt}) => {
				bufferedSend(evt);
			});
		});
	}

	if (combined.observeRun && experiments.observeRunsFromConfig) {
		combined.observeRun({
			events: asyncEventIteratorFromApi(api),
		});
	}

	api.on('run', ({data: plan}) => {
		if (isAborting) {
			return;
		}

		currentPlan = plan;
		runId++;
		reporter?.startRun(plan);
		if (plugins) {
			plugins.publish({type: 'run-start', runId, plan: messages.runPlan(plan, globs.extensions)});
		}

		plan.status.on('stateChange', ({data: evt}) => {
			if (plugins && !finishing) {
				const event = messages.runEvent(evt, plan);
				if (event) {
					plugins.publish({type: 'event', runId, event});
				}
			}

			if (evt.type === 'end' || evt.type === 'interrupt') {
				// Write out code coverage data when the run ends, lest a process
				// interrupt causes it to be lost.
				v8.takeCoverage();
			}

			if (evt.type !== 'interrupt') {
				return;
			}

			finish('interrupted', 1).then(() => {
				process.exit(1); // eslint-disable-line unicorn/no-process-exit
			});
		});
	});

	if (argv.watch) {
		if (plugins) {
			plugins.failure.catch(async error => {
				isAborting = true;
				reportedError = error;
				console.error(error.message);
				api.abort();
				if (currentPlan) {
					await finish('failed', 1);
				} else {
					await plugins.close();
				}

				process.exit(1); // eslint-disable-line unicorn/no-process-exit
			});
		}

		const {available, start} = await import('./watcher.js');
		if (!available(projectDir)) {
			exit('Watch mode requires support for recursive fs.watch()');
			return;
		}

		let abortController;
		if (process.env.TEST_AVA) {
			const {takeCoverage} = await import('node:v8');
			abortController = new AbortController();
			process.on('message', message => {
				if (message !== 'abort-watcher') {
					return;
				}

				abortController.abort();
				takeCoverage();
			});
			process.channel?.unref();
		}

		start({
			api,
			filter,
			globs,
			projectDir,
			providers,
			reporter,
			stdin: process.stdin,
			signal: abortController?.signal,
		});
	} else {
		let isDebugWithoutSpecificFile = false;
		api.on('run', ({data: plan}) => {
			if (debug !== null && plan.files.length !== 1) {
				isDebugWithoutSpecificFile = true;
			}
		});

		let runStatus;
		try {
			const running = api.run({filter});
			runStatus = await (plugins ? Promise.race([running, plugins.failure]) : running);
		} catch (error) {
			isAborting = true;
			reportedError = error;
			console.error(error.message);
			api.abort();
			if (currentPlan) {
				await finish('failed', 1);
			} else {
				await plugins?.close();
			}

			process.exitCode = 1;
			return;
		}

		if (isDebugWithoutSpecificFile && !debug.active) {
			exit('Provide the path to the test file you wish to debug');
			return;
		}

		process.exitCode = runStatus.suggestExitCode({matching: match.length > 0});
		await finish(runStatus.stats.internalErrors > 0 ? 'failed' : 'completed', process.exitCode);
	}
}
