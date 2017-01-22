'use strict';
const EventEmitter = require('events');
const fnName = require('fn-name');
const Concurrent = require('./concurrent');
const Sequence = require('./sequence');
const Test = require('./test');

class TestCollection extends EventEmitter {
	constructor() {
		super();

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

		this._emitTestResult = this._emitTestResult.bind(this);
	}
	add(test) {
		const metadata = test.metadata;
		const type = metadata.type;

		if (!type) {
			throw new Error('Test type must be specified');
		}

		if (!test.title && test.fn) {
			test.title = fnName(test.fn);
		}

		// Workaround for Babel giving anonymous functions a name
		if (test.title === 'callee$0$0') {
			test.title = null;
		}

		if (!test.title) {
			if (type === 'test') {
				test.title = '[anonymous]';
			} else {
				test.title = type;
			}
		}

		if (metadata.always && type !== 'after' && type !== 'afterEach') {
			throw new Error('"always" can only be used with after and afterEach hooks');
		}

		// Add a hook
		if (type !== 'test') {
			if (metadata.exclusive) {
				throw new Error(`"only" cannot be used with a ${type} hook`);
			}

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
		const self = this;

		return {
			run() {
				const result = {
					passed: true,
					result: test
				};

				self._emitTestResult(result);

				return result;
			}
		};
	}
	_emitTestResult(test) {
		this.emit('test', test);
	}
	_buildHooks(hooks, testTitle, context) {
		return hooks.map(hook => {
			const test = this._buildHook(hook, testTitle, context);

			if (hook.metadata.skipped || hook.metadata.todo) {
				return this._skippedTest(test);
			}

			return test;
		});
	}
	_buildHook(hook, testTitle, context) {
		let title = hook.title;

		if (testTitle) {
			title += ` for ${testTitle}`;
		}

		if (!context) {
			context = null;
		}

		const test = new Test(title, hook.fn, context, this._emitTestResult);
		test.metadata = hook.metadata;

		return test;
	}
	_buildTest(test, context) {
		if (!context) {
			context = null;
		}

		const metadata = test.metadata;

		test = new Test(test.title, test.fn, context, this._emitTestResult);
		test.metadata = metadata;

		return test;
	}
	_buildTestWithHooks(test) {
		if (test.metadata.skipped) {
			return new Sequence([this._skippedTest(this._buildTest(test))], true);
		}

		const context = {context: {}};

		const beforeHooks = this._buildHooks(this.hooks.beforeEach, test.title, context);
		const afterHooks = this._buildHooks(this.hooks.afterEach, test.title, context);

		let sequence = new Sequence([].concat(beforeHooks, this._buildTest(test, context), afterHooks), true);
		if (this.hooks.afterEachAlways.length > 0) {
			const afterAlwaysHooks = new Sequence(this._buildHooks(this.hooks.afterEachAlways, test.title, context));
			sequence = new Sequence([sequence, afterAlwaysHooks], false);
		}
		return sequence;
	}
	_buildTests(tests) {
		return tests.map(test => this._buildTestWithHooks(test));
	}
	build(bail) {
		const beforeHooks = new Sequence(this._buildHooks(this.hooks.before));
		const afterHooks = new Sequence(this._buildHooks(this.hooks.after));

		const serialTests = new Sequence(this._buildTests(this.tests.serial), bail);
		const concurrentTests = new Concurrent(this._buildTests(this.tests.concurrent), bail);
		const allTests = new Sequence([serialTests, concurrentTests]);

		let finalTests = new Sequence([beforeHooks, allTests, afterHooks], true);
		if (this.hooks.afterAlways.length > 0) {
			const afterAlwaysHooks = new Sequence(this._buildHooks(this.hooks.afterAlways));
			finalTests = new Sequence([finalTests, afterAlwaysHooks], false);
		}
		return finalTests;
	}
}

module.exports = TestCollection;
