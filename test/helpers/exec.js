import {Buffer} from 'node:buffer';
import {on} from 'node:events';
import path from 'node:path';
import {Writable} from 'node:stream';
import {fileURLToPath, pathToFileURL} from 'node:url';

import test from '@ava/test';
import {execaNode} from 'execa';

const cliPath = fileURLToPath(new URL('../../entrypoints/cli.mjs', import.meta.url));
const ttySimulator = fileURLToPath(new URL('simulate-tty.cjs', import.meta.url));

const TEST_AVA_IMPORT_FROM = pathToFileURL(path.join(process.cwd(), 'entrypoints/main.mjs'));
const TEST_AVA_REQUIRE_FROM = path.join(process.cwd(), 'entrypoints/main.cjs');

const normalizePosixPath = string => string.replaceAll('\\', '/');
const normalizePath = (root, file) => normalizePosixPath(path.posix.normalize(path.relative(root, file)));

const compareStatObjects = (a, b) => {
	if (a.file < b.file) {
		return -1;
	}

	if (a.file > b.file) {
		return 1;
	}

	if (a.title < b.title) {
		return -1;
	}

	return 1;
};

export const cwd = (...paths) => path.join(path.dirname(fileURLToPath(test.meta.file)), 'fixtures', ...paths);
export const cleanOutput = string => string.replace(/^\W+/, '').replaceAll(/\W+\n+$/g, '').trim();

const NO_FORWARD_PREFIX = Buffer.from('🤗', 'utf8');

const forwardErrorOutput = chunk => {
	if (chunk.length < 4 || NO_FORWARD_PREFIX.compare(chunk, 0, 4) !== 0) {
		process.stderr.write(chunk);
	}
};

const initState = () => {
	const errors = new WeakMap();
	const logs = new WeakMap();
	const stats = {
		failed: [],
		failedHooks: [],
		internalErrors: [],
		processExits: [],
		passed: [],
		selectedTestCount: 0,
		sharedWorkerErrors: [],
		skipped: [],
		todo: [],
		uncaughtExceptions: [],
		getError(statObject) {
			return errors.get(statObject);
		},
		getLogs(statObject) {
			return logs.get(statObject);
		},
	};

	return {
		errors, logs, stats, stdout: '', stderr: '',
	};
};

const sortStats = stats => {
	stats.failed.sort(compareStatObjects);
	stats.failedHooks.sort(compareStatObjects);
	stats.passed.sort(compareStatObjects);
	stats.skipped.sort(compareStatObjects);
	stats.todo.sort(compareStatObjects);
};

export async function * exec(args, options) {
	const workingDir = options.cwd ?? cwd();
	const execaProcess = execaNode(cliPath, args, {
		...options,
		env: {
			...options.env,
			TEST_AVA: 'true',
			TEST_AVA_IMPORT_FROM,
			TEST_AVA_REQUIRE_FROM,
		},
		cwd: workingDir,
		serialization: 'advanced',
		nodeOptions: ['--require', ttySimulator],
	});

	let {errors, logs, stats, stdout, stderr} = initState();

	execaProcess.pipeStdout(new Writable({
		write(chunk) {
			stdout += chunk;
		},
	}));
	execaProcess.pipeStderr(new Writable({
		write(chunk) {
			stderr += chunk;

			// Besides buffering stderr, if this environment variable is set, also pipe
			// to stderr. This can be useful when debugging the tests.
			if (process.env.DEBUG_TEST_AVA) {
				forwardErrorOutput(chunk);
			}
		},
	}));

	let runCount = 0;
	const statusEvents = on(execaProcess, 'message');
	const done = execaProcess.then(result => ({execa: true, result}), error => {
		sortStats(stats);
		throw Object.assign(error, {stats, runCount});
	});

	while (true) {
		const item = await Promise.race([done, statusEvents.next()]); // eslint-disable-line no-await-in-loop
		if (item.execa) {
			sortStats(stats);
			yield {
				process: execaProcess, stats, stdout, stderr, runCount,
			};
			break;
		}

		if (item.done && !item.value) {
			break;
		}

		const {value: [statusEvent]} = item;
		switch (statusEvent.type) {
			case 'end': {
				sortStats(stats);
				runCount++;
				yield {
					process: execaProcess, stats, stdout, stderr, runCount,
				};
				({errors, logs, stats, stdout, stderr} = initState());
				break;
			}

			case 'hook-failed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(workingDir, testFile)};
				errors.set(statObject, statusEvent.err);
				stats.failedHooks.push(statObject);
				break;
			}

			case 'internal-error': {
				const {testFile} = statusEvent;
				const statObject = {file: normalizePath(workingDir, testFile ?? '')};
				errors.set(statObject, statusEvent.err);
				stats.internalErrors.push(statObject);
				break;
			}

			case 'process-exit': {
				const {testFile} = statusEvent;
				const statObject = {file: normalizePath(workingDir, testFile)};
				stats.processExits.push(statObject);
				break;
			}

			case 'selected-test': {
				stats.selectedTestCount++;
				if (statusEvent.skip) {
					const {title, testFile} = statusEvent;
					stats.skipped.push({title, file: normalizePath(workingDir, testFile)});
				}

				if (statusEvent.todo) {
					const {title, testFile} = statusEvent;
					stats.todo.push({title, file: normalizePath(workingDir, testFile)});
				}

				break;
			}

			case 'shared-worker-error': {
				const {message, name, stack} = statusEvent.err;
				stats.sharedWorkerErrors.push({message, name, stack});
				break;
			}

			case 'test-passed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(workingDir, testFile)};
				stats.passed.push(statObject);
				logs.set(statObject, statusEvent.logs);
				break;
			}

			case 'test-failed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(workingDir, testFile)};
				errors.set(statObject, statusEvent.err);
				stats.failed.push(statObject);
				logs.set(statObject, statusEvent.logs);
				break;
			}

			case 'uncaught-exception': {
				const {message, name, stack} = statusEvent.err;
				stats.uncaughtExceptions.push({message, name, stack});
				break;
			}

			default: {
				break;
			}
		}
	}
}

export async function fixture(args, options = {}) {
	for await (const {process, ...result} of exec(args, options))	{ // eslint-disable-line no-unreachable-loop
		return {
			...result,
			...await process,
		};
	}
}
