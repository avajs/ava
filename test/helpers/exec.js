const path = require('path');
const v8 = require('v8');

const test = require('@ava/test');
const execa = require('execa');
const defaultsDeep = require('lodash/defaultsDeep');

const cliPath = path.resolve(__dirname, '../../cli.js');
const ttySimulator = path.join(__dirname, './simulate-tty.js');

const serialization = process.versions.node >= '12.16.0' ? 'advanced' : 'json';

const normalizePath = (root, file) => path.posix.normalize(path.relative(root, file));

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

exports.cwd = (...paths) => path.join(path.dirname(test.meta.file), 'fixtures', ...paths);

exports.fixture = async (args, options = {}) => {
	const cwd = options.cwd || exports.cwd();
	const running = execa.node(cliPath, args, defaultsDeep({
		env: {
			AVA_EMIT_RUN_STATUS_OVER_IPC: 'I\'ll find a payphone baby / Take some time to talk to you'
		},
		cwd,
		serialization,
		nodeOptions: ['--require', ttySimulator]
	}, options));

	// Besides buffering stderr, if this environment variable is set, also pipe
	// to stderr. This can be useful when debugging the tests.
	if (process.env.DEBUG_TEST_AVA) {
		running.stderr.pipe(process.stderr);
	}

	const errors = new WeakMap();
	const stats = {
		failed: [],
		failedHooks: [],
		passed: [],
		skipped: [],
		todo: [],
		uncaughtExceptions: [],
		unsavedSnapshots: [],
		getError(statObject) {
			return errors.get(statObject);
		}
	};

	running.on('message', statusEvent => {
		if (serialization === 'json') {
			statusEvent = v8.deserialize(Uint8Array.from(statusEvent));
		}

		switch (statusEvent.type) {
			case 'hook-failed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(cwd, testFile)};
				errors.set(statObject, statusEvent.err);
				stats.failedHooks.push(statObject);
				break;
			}

			case 'selected-test': {
				if (statusEvent.skip) {
					const {title, testFile} = statusEvent;
					stats.skipped.push({title, file: normalizePath(cwd, testFile)});
				}

				if (statusEvent.todo) {
					const {title, testFile} = statusEvent;
					stats.todo.push({title, file: normalizePath(cwd, testFile)});
				}

				break;
			}

			case 'snapshot-error': {
				const {testFile} = statusEvent;
				stats.unsavedSnapshots.push({file: normalizePath(cwd, testFile)});
				break;
			}

			case 'test-passed': {
				const {title, testFile} = statusEvent;
				stats.passed.push({title, file: normalizePath(cwd, testFile)});
				break;
			}

			case 'test-failed': {
				const {title, testFile} = statusEvent;
				const statObject = {title, file: normalizePath(cwd, testFile)};
				errors.set(statObject, statusEvent.err);
				stats.failed.push(statObject);
				break;
			}

			case 'uncaught-exception': {
				const {message, name, stack} = statusEvent.err;
				stats.uncaughtExceptions.push({message, name, stack});
				break;
			}

			default:
				break;
		}
	});

	try {
		return {
			stats,
			...await running
		};
	} catch (error) {
		throw Object.assign(error, {stats});
	} finally {
		stats.failed.sort(compareStatObjects);
		stats.failedHooks.sort(compareStatObjects);
		stats.passed.sort(compareStatObjects);
		stats.skipped.sort(compareStatObjects);
		stats.todo.sort(compareStatObjects);
		stats.unsavedSnapshots.sort(compareStatObjects);
	}
};
