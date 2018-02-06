'use strict';
const EventEmitter = require('events');
const path = require('path');
const Bluebird = require('bluebird');
const matcher = require('matcher');
const snapshotManager = require('./snapshot-manager');
const TestCollection = require('./test-collection');
const validateTest = require('./validate-test');

const chainRegistry = new WeakMap();

function startChain(name, call, defaults) {
	const fn = function () {
		call(Object.assign({}, defaults), Array.from(arguments));
	};
	Object.defineProperty(fn, 'name', {value: name});
	chainRegistry.set(fn, {call, defaults, fullName: name});
	return fn;
}

function extendChain(prev, name, flag) {
	if (!flag) {
		flag = name;
	}

	const fn = function () {
		callWithFlag(prev, flag, Array.from(arguments));
	};
	const fullName = `${chainRegistry.get(prev).fullName}.${name}`;
	Object.defineProperty(fn, 'name', {value: fullName});
	prev[name] = fn;

	chainRegistry.set(fn, {flag, fullName, prev});
	return fn;
}

function callWithFlag(prev, flag, args) {
	const combinedFlags = {[flag]: true};
	do {
		const step = chainRegistry.get(prev);
		if (step.call) {
			step.call(Object.assign({}, step.defaults, combinedFlags), args);
			prev = null;
		} else {
			combinedFlags[step.flag] = true;
			prev = step.prev;
		}
	} while (prev);
}

function createHookChain(hook, isAfterHook) {
	// Hook chaining rules:
	// * `always` comes immediately after "after hooks"
	// * `skip` must come at the end
	// * no `only`
	// * no repeating
	extendChain(hook, 'cb', 'callback');
	extendChain(hook, 'skip', 'skipped');
	extendChain(hook.cb, 'skip', 'skipped');
	if (isAfterHook) {
		extendChain(hook, 'always');
		extendChain(hook.always, 'cb', 'callback');
		extendChain(hook.always, 'skip', 'skipped');
		extendChain(hook.always.cb, 'skip', 'skipped');
	}
	return hook;
}

function createChain(fn, defaults) {
	// Test chaining rules:
	// * `serial` must come at the start
	// * `only` and `skip` must come at the end
	// * `failing` must come at the end, but can be followed by `only` and `skip`
	// * `only` and `skip` cannot be chained together
	// * no repeating
	const root = startChain('test', fn, Object.assign({}, defaults, {type: 'test'}));
	extendChain(root, 'cb', 'callback');
	extendChain(root, 'failing');
	extendChain(root, 'only', 'exclusive');
	extendChain(root, 'serial');
	extendChain(root, 'skip', 'skipped');
	extendChain(root.cb, 'failing');
	extendChain(root.cb, 'only', 'exclusive');
	extendChain(root.cb, 'skip', 'skipped');
	extendChain(root.cb.failing, 'only', 'exclusive');
	extendChain(root.cb.failing, 'skip', 'skipped');
	extendChain(root.failing, 'only', 'exclusive');
	extendChain(root.failing, 'skip', 'skipped');
	extendChain(root.serial, 'cb', 'callback');
	extendChain(root.serial, 'failing');
	extendChain(root.serial, 'only', 'exclusive');
	extendChain(root.serial, 'skip', 'skipped');
	extendChain(root.serial.cb, 'failing');
	extendChain(root.serial.cb, 'only', 'exclusive');
	extendChain(root.serial.cb, 'skip', 'skipped');
	extendChain(root.serial.cb.failing, 'only', 'exclusive');
	extendChain(root.serial.cb.failing, 'skip', 'skipped');

	root.after = createHookChain(startChain('test.after', fn, Object.assign({}, defaults, {type: 'after'})), true);
	root.afterEach = createHookChain(startChain('test.afterEach', fn, Object.assign({}, defaults, {type: 'afterEach'})), true);
	root.before = createHookChain(startChain('test.before', fn, Object.assign({}, defaults, {type: 'before'})), false);
	root.beforeEach = createHookChain(startChain('test.beforeEach', fn, Object.assign({}, defaults, {type: 'beforeEach'})), false);

	// Todo tests cannot be chained. Allow todo tests to be flagged as needing to
	// be serial.
	root.todo = startChain('test.todo', fn, Object.assign({}, defaults, {type: 'test', todo: true}));
	root.serial.todo = startChain('test.serial.todo', fn, Object.assign({}, defaults, {serial: true, type: 'test', todo: true}));

	return root;
}

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
		this.runOnlyExclusive = options.runOnlyExclusive;

		this.hasStarted = false;
		this.results = [];
		this.snapshots = null;
		this.tests = new TestCollection({
			bail: options.bail,
			failWithoutAssertions: options.failWithoutAssertions,
			compareTestSnapshot: this.compareTestSnapshot.bind(this)
		});

		this.chain = createChain((opts, args) => {
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
		}, {
			serial: false,
			exclusive: false,
			skipped: false,
			todo: false,
			failing: false,
			callback: false,
			always: false
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

		if (!this.scheduledStart) {
			this.scheduledStart = true;
			process.nextTick(() => {
				this.emit('start', this._run());
			});
		}
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

	_run() {
		this.hasStarted = true;

		if (this.runOnlyExclusive && !this.tests.hasExclusive) {
			return Promise.resolve(null);
		}

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
