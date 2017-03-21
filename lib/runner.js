'use strict';
const EventEmitter = require('events');
const path = require('path');
const Bluebird = require('bluebird');
const jestSnapshot = require('jest-snapshot');
const optionChain = require('option-chain');
const matcher = require('matcher');
const TestCollection = require('./test-collection');
const validateTest = require('./validate-test');

const chainableMethods = {
	defaults: {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false,
		todo: false,
		failing: false,
		callback: false,
		always: false
	},
	chainableMethods: {
		test: {},
		serial: {serial: true},
		before: {type: 'before'},
		after: {type: 'after'},
		skip: {skipped: true},
		todo: {todo: true},
		failing: {failing: true},
		only: {exclusive: true},
		beforeEach: {type: 'beforeEach'},
		afterEach: {type: 'afterEach'},
		cb: {callback: true},
		always: {always: true}
	}
};

function wrapFunction(fn, args) {
	return function (t) {
		return fn.apply(this, [t].concat(args));
	};
}

class Runner extends EventEmitter {
	constructor(options) {
		super();

		options = options || {};

		this.file = options.file;
		this.match = options.match || [];
		this.serial = options.serial;
		this.updateSnapshots = options.updateSnapshots;

		this.hasStarted = false;
		this.results = [];
		this.snapshotState = null;
		this.tests = new TestCollection({
			bail: options.bail,
			failWithoutAssertions: options.failWithoutAssertions,
			getSnapshotState: () => this.getSnapshotState()
		});

		this.chain = optionChain(chainableMethods, (opts, args) => {
			let title;
			let fn;
			let macroArgIndex;

			if (this.hasStarted) {
				throw new Error('All tests and hooks must be declared synchronously in your ' +
				'test file, and cannot be nested within other tests or hooks.');
			}

			if (typeof args[0] === 'string') {
				title = args[0];
				fn = args[1];
				macroArgIndex = 2;
			} else {
				fn = args[0];
				title = null;
				macroArgIndex = 1;
			}

			if (this.serial) {
				opts.serial = true;
			}

			if (args.length > macroArgIndex) {
				args = args.slice(macroArgIndex);
			} else {
				args = null;
			}

			if (Array.isArray(fn)) {
				fn.forEach(fn => {
					this.addTest(title, opts, fn, args);
				});
			} else {
				this.addTest(title, opts, fn, args);
			}
		});
	}

	addTest(title, metadata, fn, args) {
		if (args) {
			if (fn.title) {
				title = fn.title.apply(fn, [title || ''].concat(args));
			}

			fn = wrapFunction(fn, args);
		}

		if (metadata.type === 'test' && this.match.length > 0) {
			metadata.exclusive = title !== null && matcher([title], this.match).length === 1;
		}

		const validationError = validateTest(title, fn, metadata);
		if (validationError !== null) {
			throw new TypeError(validationError);
		}

		this.tests.add({
			metadata,
			fn,
			title
		});
	}

	addTestResult(result) {
		const test = result.result;
		const props = {
			duration: test.duration,
			title: test.title,
			error: result.reason,
			type: test.metadata.type,
			skip: test.metadata.skipped,
			todo: test.metadata.todo,
			failing: test.metadata.failing
		};

		this.results.push(result);
		this.emit('test', props);
	}

	buildStats() {
		const stats = {
			failCount: 0,
			knownFailureCount: 0,
			passCount: 0,
			skipCount: 0,
			testCount: 0,
			todoCount: 0
		};

		for (const result of this.results) {
			if (!result.passed) {
				// Includes hooks
				stats.failCount++;
			}

			const metadata = result.result.metadata;
			if (metadata.type === 'test') {
				stats.testCount++;

				if (metadata.skipped) {
					stats.skipCount++;
				} else if (metadata.todo) {
					stats.todoCount++;
				} else if (result.passed) {
					if (metadata.failing) {
						stats.knownFailureCount++;
					} else {
						stats.passCount++;
					}
				}
			}
		}

		return stats;
	}

	getSnapshotState() {
		if (this.snapshotState) {
			return this.snapshotState;
		}

		const name = path.basename(this.file) + '.snap';
		const dir = path.dirname(this.file);

		const snapshotPath = path.join(dir, '__snapshots__', name);
		const testPath = this.file;
		const update = this.updateSnapshots;

		const state = jestSnapshot.initializeSnapshotState(testPath, update, snapshotPath);
		this.snapshotState = state;
		return state;
	}

	saveSnapshotState() {
		if (this.snapshotState) {
			this.snapshotState.save(this.updateSnapshots);
		}
	}

	run(options) {
		if (options.runOnlyExclusive && !this.tests.hasExclusive) {
			return Promise.resolve(null);
		}

		this.hasStarted = true;
		this.tests.on('test', result => {
			this.addTestResult(result);
		});
		return Bluebird.try(() => this.tests.build().run());
	}
	attributeLeakedError(err) {
		return this.tests.attributeLeakedError(err);
	}
}

module.exports = Runner;
