'use strict';
const coreAssert = require('core-assert');
const deepEqual = require('lodash.isequal');
const observableToPromise = require('observable-to-promise');
const indentString = require('indent-string');
const isObservable = require('is-observable');
const isPromise = require('is-promise');
const jestSnapshot = require('jest-snapshot');
const enhanceAssert = require('./enhance-assert');
const snapshotState = require('./snapshot-state');

class AssertionError extends Error {
	constructor(opts) {
		super(opts.message || '');
		this.name = 'AssertionError';

		this.actual = opts.actual;
		this.assertion = opts.assertion;
		this.expected = opts.expected;
		this.hasActual = 'actual' in opts;
		this.hasExpected = 'expected' in opts;
		this.operator = opts.operator;

		// Reserved for power-assert statements
		this.statements = null;

		if (opts.stack) {
			this.stack = opts.stack;
		} else {
			Error.captureStackTrace(this, opts.stackStartFunction);
		}
	}
}
exports.AssertionError = AssertionError;

function wrapAssertions(callbacks) {
	const pass = callbacks.pass;
	const pending = callbacks.pending;
	const fail = callbacks.fail;

	const noop = () => {};
	const makeNoop = () => noop;
	const makeRethrow = reason => () => {
		throw reason;
	};

	const assertions = {
		pass() {
			pass(this);
		},

		fail(message) {
			fail(this, new AssertionError({
				assertion: 'fail',
				message: message || 'Test failed via t.fail()',
				stackStartFunction: assertions.fail
			}));
		},

		is(actual, expected, message) {
			if (actual === expected) {
				pass(this);
			} else {
				fail(this, new AssertionError({
					actual,
					assertion: 'is',
					expected,
					message,
					operator: '===',
					stackStartFunction: assertions.is
				}));
			}
		},

		not(actual, expected, message) {
			if (actual === expected) {
				fail(this, new AssertionError({
					actual,
					assertion: 'not',
					expected,
					message,
					operator: '!==',
					stackStartFunction: assertions.not
				}));
			} else {
				pass(this);
			}
		},

		deepEqual(actual, expected, message) {
			if (deepEqual(actual, expected)) {
				pass(this);
			} else {
				fail(this, new AssertionError({
					actual,
					assertion: 'deepEqual',
					expected,
					message,
					stackStartFunction: assertions.deepEqual
				}));
			}
		},

		notDeepEqual(actual, expected, message) {
			if (deepEqual(actual, expected)) {
				fail(this, new AssertionError({
					actual,
					assertion: 'notDeepEqual',
					expected,
					message,
					stackStartFunction: assertions.notDeepEqual
				}));
			} else {
				pass(this);
			}
		},

		throws(fn, err, message) {
			let promise;
			if (isPromise(fn)) {
				promise = fn;
			} else if (isObservable(fn)) {
				promise = observableToPromise(fn);
			} else if (typeof fn !== 'function') {
				fail(this, new AssertionError({
					actual: fn,
					message: '`t.throws()` must be called with a function, Promise, or Observable'
				}));
				return;
			}

			let coreAssertThrowsErrorArg;
			if (typeof err === 'string') {
				const expectedMessage = err;
				coreAssertThrowsErrorArg = error => error.message === expectedMessage;
			} else {
				// Assume it's a constructor function or regular expression
				coreAssertThrowsErrorArg = err;
			}

			const test = fn => {
				try {
					let retval;
					coreAssert.throws(() => {
						try {
							fn();
						} catch (err) {
							retval = err;
							throw err;
						}
					}, coreAssertThrowsErrorArg);
					return retval;
				} catch (err) {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stackStartFunction: assertions.throws
					});
				}
			};

			if (promise) {
				const result = promise.then(makeNoop, makeRethrow).then(test);
				pending(this, result);
				return result;
			}

			try {
				const retval = test(fn);
				pass(this);
				return retval;
			} catch (err) {
				fail(this, err);
			}
		},

		notThrows(fn, message) {
			let promise;
			if (isPromise(fn)) {
				promise = fn;
			} else if (isObservable(fn)) {
				promise = observableToPromise(fn);
			} else if (typeof fn !== 'function') {
				fail(this, new AssertionError({
					actual: fn,
					message: '`t.notThrows()` must be called with a function, Promise, or Observable'
				}));
				return;
			}

			const test = fn => {
				try {
					coreAssert.doesNotThrow(fn);
				} catch (err) {
					throw new AssertionError({
						actual: err.actual,
						assertion: 'notThrows',
						message,
						stackStartFunction: assertions.notThrows
					});
				}
			};

			if (promise) {
				const result = promise
					.then(
						noop,
						reason => test(makeRethrow(reason)));
				pending(this, result);
				return result;
			}

			try {
				test(fn);
				pass(this);
			} catch (err) {
				fail(this, err);
			}
		},

		ifError(actual, message) {
			if (actual) {
				fail(this, new AssertionError({
					actual,
					assertion: 'ifError',
					message,
					stackStartFunction: assertions.ifError
				}));
			} else {
				pass(this);
			}
		},

		snapshot(actual, optionalMessage) {
			const result = snapshot(this, actual, optionalMessage);
			if (result.pass) {
				pass(this);
			} else {
				fail(this, new AssertionError({
					actual,
					assertion: 'snapshot',
					expected: result.expected,
					message: result.message,
					stackStartFunction: assertions.snapshot
				}));
			}
		}
	};

	const enhancedAssertions = enhanceAssert(pass, fail, {
		truthy(actual, message) {
			if (!actual) {
				throw new AssertionError({
					actual,
					assertion: 'truthy',
					expected: true,
					message,
					operator: '==',
					stackStartFunction: enhancedAssertions.truthy
				});
			}
		},

		falsy(actual, message) {
			if (actual) {
				throw new AssertionError({
					actual,
					assertion: 'falsy',
					expected: false,
					message,
					operator: '==',
					stackStartFunction: enhancedAssertions.falsy
				});
			}
		},

		true(actual, message) {
			if (actual !== true) {
				throw new AssertionError({
					actual,
					assertion: 'true',
					expected: true,
					message,
					operator: '===',
					stackStartFunction: enhancedAssertions.true
				});
			}
		},

		false(actual, message) {
			if (actual !== false) {
				throw new AssertionError({
					actual,
					assertion: 'false',
					expected: false,
					message,
					operator: '===',
					stackStartFunction: enhancedAssertions.false
				});
			}
		},

		regex(actual, expected, message) {
			if (!expected.test(actual)) {
				throw new AssertionError({
					actual,
					assertion: 'regex',
					expected,
					message,
					stackStartFunction: enhancedAssertions.regex
				});
			}
		},

		notRegex(actual, expected, message) {
			if (expected.test(actual)) {
				throw new AssertionError({
					actual,
					assertion: 'notRegex',
					expected,
					message,
					stackStartFunction: enhancedAssertions.notRegex
				});
			}
		}
	});

	return Object.assign(assertions, enhancedAssertions);
}
exports.wrapAssertions = wrapAssertions;

function snapshot(executionContext, tree, optionalMessage, match, snapshotStateGetter) {
	// Set defaults - this allows tests to mock deps easily
	const toMatchSnapshot = match || jestSnapshot.toMatchSnapshot;
	const getState = snapshotStateGetter || snapshotState.get;

	const state = getState();

	const context = {
		dontThrow() {},
		currentTestName: executionContext.title,
		snapshotState: state
	};

	// Symbols can't be serialized and saved in a snapshot, that's why tree
	// is saved in the `__ava_react_jsx` prop, so that JSX can be detected later
	const serializedTree = tree.$$typeof === Symbol.for('react.test.json') ? {__ava_react_jsx: tree} : tree; // eslint-disable-line camelcase
	const result = toMatchSnapshot.call(context, JSON.stringify(serializedTree));

	let message = 'Please check your code or --update-snapshots';

	if (optionalMessage) {
		message += '\n\n' + indentString(optionalMessage, 2);
	}

	state.save();

	let expected;

	if (result.expected) {
		// JSON in a snapshot is surrounded with `"`, because jest-snapshot
		// serializes snapshot values too, so it ends up double JSON encoded
		expected = JSON.parse(result.expected.slice(1).slice(0, -1));
		// Define a `$$typeof` symbol, so that pretty-format detects it as React tree
		if (expected.__ava_react_jsx) { // eslint-disable-line camelcase
			expected = expected.__ava_react_jsx; // eslint-disable-line camelcase
			Object.defineProperty(expected, '$$typeof', {value: Symbol.for('react.test.json')});
		}
	}

	return {
		pass: result.pass,
		expected,
		message
	};
}
exports.snapshot = snapshot;
