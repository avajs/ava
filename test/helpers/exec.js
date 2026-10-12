import {Buffer} from 'node:buffer';
import path from 'node:path';
import process from 'node:process';
import {Writable} from 'node:stream';
import {fileURLToPath, pathToFileURL} from 'node:url';

import test from '@ava/test';
import {execaNode} from 'execa';

const cliPath = fileURLToPath(new URL('../../entrypoints/cli.js', import.meta.url));
const ttySimulator = fileURLToPath(new URL('simulate-tty.js', import.meta.url));

const TEST_AVA_IMPORT_FROM = pathToFileURL(path.join(process.cwd(), 'entrypoints/main.js'));

const normalizePosixPath = string => string.replaceAll('\\', '/');
const normalizePath = (root, file) => normalizePosixPath(path.posix.normalize(path.relative(root, file)));

const compareStatObjects = (a, b) => {
	if (a.file < b.file) {
		return -1;
	}

	if (a.file > b.file) {
		return 1;
	}

	return a.title < b.title ? -1 : 1;
};

export const resolveFixtureDirectory = (...paths) => path.join(path.dirname(fileURLToPath(test.meta.file)), 'fixtures', ...paths);
export const cleanOutput = string => string.replace(/^\W+/, '').replaceAll(/\W+\n$/g, '').trim();

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
	let {errors, logs, stats, stdout, stderr} = initState();

	const workingDir = options.cwd ?? resolveFixtureDirectory();
	const execaProcess = execaNode(cliPath, args, {
		...options,
		env: {
			...options.env,
			TEST_AVA: 'true',
			TEST_AVA_IMPORT_FROM,
		},
		cwd: workingDir,
		nodeOptions: ['--import', pathToFileURL(ttySimulator).toString()],
		stdout: ['pipe', new Writable({
			write(chunk, encoding, callback) {
				stdout += chunk;
				callback();
			},
		})],
		stderr: ['pipe', new Writable({
			write(chunk, encoding, callback) {
				stderr += chunk;

				// Besides buffering stderr, if this environment variable is set, also pipe
				// to stderr. This can be useful when debugging the tests.
				if (process.env.DEBUG_TEST_AVA) {
					forwardErrorOutput(chunk);
				}

				callback();
			},
		})],
	});

	let runCount = 0;
	const statusEvents = execaProcess.getEachMessage();
	const done = execaProcess.catch(error => {
		sortStats(stats);
		throw Object.assign(error, {stats, runCount});
	}).then(result => ({execa: true, result}));

	loop: while (true) {
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

		const {value: statusEvent} = item;
		switch (statusEvent.type) {
			case 'end': {
				sortStats(stats);
				runCount++;
				yield {
					process: execaProcess, stats, stdout, stderr, runCount,
				};
				({errors, logs, stats, stdout, stderr} = initState());
				continue loop;
			}

			case 'hook-failed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(workingDir, testFile)};
				errors.set(statObject, statusEvent.err);
				stats.failedHooks.push(statObject);
				continue loop;
			}

			case 'internal-error': {
				const {testFile} = statusEvent;
				const statObject = {file: normalizePath(workingDir, testFile ?? '')};
				errors.set(statObject, statusEvent.err);
				stats.internalErrors.push(statObject);
				continue loop;
			}

			case 'process-exit': {
				const {testFile} = statusEvent;
				const statObject = {file: normalizePath(workingDir, testFile)};
				stats.processExits.push(statObject);
				continue loop;
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

				continue loop;
			}

			case 'shared-worker-error': {
				const {message, name, stack} = statusEvent.err;
				stats.sharedWorkerErrors.push({message, name, stack});
				continue loop;
			}

			case 'test-passed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(workingDir, testFile)};
				stats.passed.push(statObject);
				logs.set(statObject, statusEvent.logs);
				continue loop;
			}

			case 'test-failed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(workingDir, testFile)};
				errors.set(statObject, statusEvent.err);
				stats.failed.push(statObject);
				logs.set(statObject, statusEvent.logs);
				continue loop;
			}

			case 'uncaught-exception': {
				const {message, name, stack} = statusEvent.err;
				stats.uncaughtExceptions.push({message, name, stack});
				continue loop;
			}

			default: {
				continue loop;
			}
		}
	}
}

export async function fixture(args, options = {}) {
	for await (const {process: execaProcess, ...result} of exec(args, options))	{ // eslint-disable-line no-unreachable-loop
		return {
			...result,
			...await execaProcess,
		};
	}
}
