import {Buffer} from 'node:buffer';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import test from '@ava/test';
import {execaNode} from 'execa';
import replaceString from 'replace-string';

const cliPath = fileURLToPath(new URL('../../entrypoints/cli.mjs', import.meta.url));
const ttySimulator = fileURLToPath(new URL('simulate-tty.cjs', import.meta.url));

const TEST_AVA_IMPORT_FROM = path.join(process.cwd(), 'entrypoints/main.cjs');

const normalizePosixPath = string => replaceString(string, '\\', '/');
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
export const cleanOutput = string => string.replace(/^\W+/, '').replace(/\W+\n+$/g, '').trim();

const NO_FORWARD_PREFIX = Buffer.from('🤗', 'utf8');

const forwardErrorOutput = async from => {
	for await (const message of from) {
		if (NO_FORWARD_PREFIX.compare(message, 0, 4) !== 0) {
			process.stderr.write(message);
		}
	}
};

export const fixture = async (args, options = {}) => {
	const workingDir = options.cwd || cwd();
	const running = execaNode(cliPath, args, {
		...options,
		env: {
			...options.env,
			AVA_EMIT_RUN_STATUS_OVER_IPC: 'I\'ll find a payphone baby / Take some time to talk to you',
			TEST_AVA_IMPORT_FROM,
		},
		cwd: workingDir,
		serialization: 'advanced',
		nodeOptions: ['--require', ttySimulator],
	});

	// Besides buffering stderr, if this environment variable is set, also pipe
	// to stderr. This can be useful when debugging the tests.
	if (process.env.DEBUG_TEST_AVA) {
		// Running.stderr.pipe(process.stderr);
		forwardErrorOutput(running.stderr);
	}

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

	running.on('message', statusEvent => {
		switch (statusEvent.type) {
			case 'hook-failed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(workingDir, testFile)};
				errors.set(statObject, statusEvent.err);
				stats.failedHooks.push(statObject);
				break;
			}

			case 'internal-error': {
				const {testFile} = statusEvent;
				const statObject = {file: normalizePath(workingDir, testFile)};
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
	});

	try {
		return {
			stats,
			...await running,
		};
	} catch (error) {
		throw Object.assign(error, {stats});
	} finally {
		stats.failed.sort(compareStatObjects);
		stats.failedHooks.sort(compareStatObjects);
		stats.passed.sort(compareStatObjects);
		stats.skipped.sort(compareStatObjects);
		stats.todo.sort(compareStatObjects);
	}
};
