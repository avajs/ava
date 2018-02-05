'use strict';
const EventEmitter = require('events');
const clone = require('lodash.clone');
const Concurrent = require('./concurrent');
const Sequence = require('./sequence');
const Test = require('./test');

class ContextRef {
	constructor() {
		this.value = {};
	}

	get() {
		return this.value;
	}

	set(newValue) {
		this.value = newValue;
	}

	copy() {
		return new LateBinding(this); // eslint-disable-line no-use-before-define
	}
}

class LateBinding extends ContextRef {
	constructor(ref) {
		super();
		this.ref = ref;
		this.bound = false;
	}

	get() {
		if (!this.bound) {
			this.set(clone(this.ref.get()));
		}
		return super.get();
	}

	set(newValue) {
		this.bound = true;
		super.set(newValue);
	}
}

class TestCollection extends EventEmitter {
	constructor(options) {
		super();

		this.bail = options.bail;
		this.failWithoutAssertions = options.failWithoutAssertions;
		this.compareTestSnapshot = options.compareTestSnapshot;
		this.hasExclusive = false;
		this.testCount = 0;

		this.tests = {
			concurrent: [],
			serial: []
		};

		this.hooks = {
			before: [],
			beforeEach: [],
			after: [],
			afterAlways: [],
			afterEach: [],
			afterEachAlways: []
		};

		this.pendingTestInstances = new Set();
		this.uniqueTestTitles = new Set();

		this._emitTestResult = this._emitTestResult.bind(this);
	}

	add(test) {
		const metadata = test.metadata;
		const type = metadata.type;

		if (test.title === '' || typeof test.title !== 'string') {
			if (type === 'test') {
				throw new TypeError('Tests must have a title');
			} else {
				test.title = `${type} hook`;
			}
		}

		if (type === 'test') {
			if (this.uniqueTestTitles.has(test.title)) {
				throw new Error(`Duplicate test title: ${test.title}`);
			} else {
				this.uniqueTestTitles.add(test.title);
			}
		}

		// Add a hook
		if (type !== 'test') {
			this.hooks[type + (metadata.always ? 'Always' : '')].push(test);
			return;
		}

		this.testCount++;

		// Add `.only()` tests if `.only()` was used previously
		if (this.hasExclusive && !metadata.exclusive) {
			return;
		}

		if (metadata.exclusive && !this.hasExclusive) {
			this.tests.concurrent = [];
			this.tests.serial = [];
			this.hasExclusive = true;
		}

		if (metadata.serial) {
			this.tests.serial.push(test);
		} else {
			this.tests.concurrent.push(test);
		}
	}

	_skippedTest(test) {
		return {
			run: () => {
				this._emitTestResult({
					passed: true,
					result: test
				});

				return true;
			}
		};
	}

	_emitTestResult(result) {
		this.pendingTestInstances.delete(result.result);
		this.emit('test', result);
	}

	_buildHooks(hooks, testTitle, contextRef) {
		return hooks.map(hook => {
			const test = this._buildHook(hook, testTitle, contextRef);

			if (hook.metadata.skipped || hook.metadata.todo) {
				return this._skippedTest(test);
			}

			return test;
		});
	}

	_buildHook(hook, testTitle, contextRef) {
		let title = hook.title;

		if (testTitle) {
			title += ` for ${testTitle}`;
		}

		const test = new Test({
			contextRef,
			failWithoutAssertions: false,
			fn: hook.fn,
			compareTestSnapshot: this.compareTestSnapshot,
			metadata: hook.metadata,
			onResult: this._emitTestResult,
			title
		});
		this.pendingTestInstances.add(test);
		return test;
	}

	_buildTest(test, contextRef) {
		test = new Test({
			contextRef,
			failWithoutAssertions: this.failWithoutAssertions,
			fn: test.fn,
			compareTestSnapshot: this.compareTestSnapshot,
			metadata: test.metadata,
			onResult: this._emitTestResult,
			title: test.title
		});
		this.pendingTestInstances.add(test);
		return test;
	}

	_buildTestWithHooks(test, contextRef) {
		if (test.metadata.skipped || test.metadata.todo) {
			return new Sequence([this._skippedTest(this._buildTest(test))], true);
		}

		const copiedRef = contextRef.copy();

		const beforeHooks = this._buildHooks(this.hooks.beforeEach, test.title, copiedRef);
		const afterHooks = this._buildHooks(this.hooks.afterEach, test.title, copiedRef);

		let sequence = new Sequence([].concat(beforeHooks, this._buildTest(test, copiedRef), afterHooks), true);
		if (this.hooks.afterEachAlways.length > 0) {
			const afterAlwaysHooks = new Sequence(this._buildHooks(this.hooks.afterEachAlways, test.title, copiedRef));
			sequence = new Sequence([sequence, afterAlwaysHooks], false);
		}
		return sequence;
	}

	_buildTests(tests, contextRef) {
		return tests.map(test => this._buildTestWithHooks(test, contextRef));
	}

	_hasUnskippedTests() {
		return this.tests.serial.concat(this.tests.concurrent)
			.some(test => {
				return !(test.metadata && test.metadata.skipped === true);
			});
	}

	build() {
		const contextRef = new ContextRef();

		const serialTests = new Sequence(this._buildTests(this.tests.serial, contextRef), this.bail);
		const concurrentTests = new Concurrent(this._buildTests(this.tests.concurrent, contextRef), this.bail);
		const allTests = new Sequence([serialTests, concurrentTests]);

		let finalTests;
		// Only run before and after hooks when there are unskipped tests
		if (this._hasUnskippedTests()) {
			const beforeHooks = new Sequence(this._buildHooks(this.hooks.before, null, contextRef));
			const afterHooks = new Sequence(this._buildHooks(this.hooks.after, null, contextRef));
			finalTests = new Sequence([beforeHooks, allTests, afterHooks], true);
		} else {
			finalTests = new Sequence([allTests], true);
		}

		if (this.hooks.afterAlways.length > 0) {
			const afterAlwaysHooks = new Sequence(this._buildHooks(this.hooks.afterAlways, null, contextRef));
			finalTests = new Sequence([finalTests, afterAlwaysHooks], false);
		}

		return finalTests;
	}

	attributeLeakedError(err) {
		for (const test of this.pendingTestInstances) {
			if (test.attributeLeakedError(err)) {
				return true;
			}
		}
		return false;
	}
}

module.exports = TestCollection;
