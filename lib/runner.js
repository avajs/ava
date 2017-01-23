'use strict';
const EventEmitter = require('events');
const Promise = require('bluebird');
const optionChain = require('option-chain');
const matcher = require('matcher');
const TestCollection = require('./test-collection');
const validateTest = require('./validate-test');

function noop() {}

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

		this.results = [];
		this.tests = new TestCollection();
		this.hasStarted = false;
		this._bail = options.bail;
		this._serial = options.serial;
		this._match = options.match || [];
		this._addTestResult = this._addTestResult.bind(this);
		this._buildStats = this._buildStats.bind(this);
	}
	_addTest(title, opts, fn, args) {
		if (args) {
			if (fn.title) {
				title = fn.title.apply(fn, [title || ''].concat(args));
			}

			fn = wrapFunction(fn, args);
		}

		if (opts.type === 'test' && this._match.length > 0) {
			opts.exclusive = title !== null && matcher([title], this._match).length === 1;
		}

		const validationError = validateTest(title, fn, opts);
		if (validationError !== null) {
			throw new TypeError(validationError);
		}

		if (opts.todo) {
			fn = noop;
		}

		this.tests.add({
			metadata: opts,
			fn,
			title
		});
	}
	_addTestResult(result) {
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
	_buildStats() {
		const stats = {
			testCount: 0,
			skipCount: 0,
			todoCount: 0
		};

		this.results
			.map(result => {
				return result.result;
			})
			.filter(test => {
				return test.metadata.type === 'test';
			})
			.forEach(test => {
				stats.testCount++;

				if (test.metadata.skipped) {
					stats.skipCount++;
				}

				if (test.metadata.todo) {
					stats.todoCount++;
				}
			});

		stats.failCount = this.results
			.filter(result => {
				return result.passed === false;
			})
			.length;

		stats.knownFailureCount = this.results
			.filter(result => {
				return result.passed === true && result.result.metadata.failing;
			})
			.length;

		stats.passCount = stats.testCount - stats.failCount - stats.skipCount - stats.todoCount;

		return stats;
	}
	run(options) {
		if (options.runOnlyExclusive && !this.tests.hasExclusive) {
			return Promise.resolve(null);
		}

		this.tests.on('test', this._addTestResult);

		this.hasStarted = true;

		return Promise.resolve(this.tests.build(this._bail).run()).then(this._buildStats);
	}
}

optionChain(chainableMethods, function (opts, args) {
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

	if (this._serial) {
		opts.serial = true;
	}

	if (args.length > macroArgIndex) {
		args = args.slice(macroArgIndex);
	} else {
		args = null;
	}

	if (Array.isArray(fn)) {
		fn.forEach(function (fn) {
			this._addTest(title, opts, fn, args);
		}, this);
	} else {
		this._addTest(title, opts, fn, args);
	}
}, Runner.prototype);

Runner._chainableMethods = chainableMethods.chainableMethods;

module.exports = Runner;
