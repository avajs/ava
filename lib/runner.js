'use strict';
const EventEmitter = require('events');
const path = require('path');
const Bluebird = require('bluebird');
const optionChain = require('option-chain');
const matcher = require('matcher');
const snapshotManager = require('./snapshot-manager');
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
		this.projectDir = options.projectDir;
		this.serial = options.serial;
		this.updateSnapshots = options.updateSnapshots;
		this.snapshotDir = options.snapshotDir;

		this.hasStarted = false;
		this.results = [];
		this.snapshots = null;
		this.tests = new TestCollection({
			bail: options.bail,
			failWithoutAssertions: options.failWithoutAssertions,
			compareTestSnapshot: this.compareTestSnapshot.bind(this)
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
			metadata.exclusive = matcher([title || ''], this.match).length === 1;
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
			logs: test.logs,
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

	compareTestSnapshot(options) {
		if (!this.snapshots) {
			this.snapshots = snapshotManager.load({
				file: this.file,
				fixedLocation: this.snapshotDir,
				name: path.basename(this.file),
				projectDir: this.projectDir,
				relFile: path.relative(this.projectDir, this.file),
				testDir: path.dirname(this.file),
				updating: this.updateSnapshots
			});
			this.emit('dependency', this.snapshots.snapPath);
		}

		return this.snapshots.compare(options);
	}

	saveSnapshotState() {
		if (this.snapshots) {
			const files = this.snapshots.save();
			if (files) {
				this.emit('touched', files);
			}
		} else if (this.updateSnapshots) {
			// TODO: There may be unused snapshot files if no test caused the
			// snapshots to be loaded. Prune them. But not if tests (including hooks!)
			// were skipped. Perhaps emit a warning if this occurs?
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
