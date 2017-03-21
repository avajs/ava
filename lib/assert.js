'use strict';
const coreAssert = require('core-assert');
const deepEqual = require('lodash.isequal');
const observableToPromise = require('observable-to-promise');
const isObservable = require('is-observable');
const isPromise = require('is-promise');
const jestDiff = require('jest-diff');
const enhanceAssert = require('./enhance-assert');
const formatAssertError = require('./format-assert-error');

class AssertionError extends Error {
	constructor(opts) {
		super(opts.message || '');
		this.name = 'AssertionError';

		this.assertion = opts.assertion;
		this.fixedSource = opts.fixedSource;
		this.improperUsage = opts.improperUsage || false;
		this.operator = opts.operator;
		this.values = opts.values || [];

		// Reserved for power-assert statements
		this.statements = [];

		if (opts.stack) {
			this.stack = opts.stack;
		}
	}
}
exports.AssertionError = AssertionError;

function getStack() {
	const obj = {};
	Error.captureStackTrace(obj, getStack);
	return obj.stack;
}

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
				message: message || 'Test failed via `t.fail()`'
			}));
		},

		is(actual, expected, message) {
			if (actual === expected) {
				pass(this);
			} else {
				const diff = formatAssertError.formatDiff(actual, expected);
				const values = diff ? [diff] : [
					formatAssertError.formatWithLabel('Actual:', actual),
					formatAssertError.formatWithLabel('Must be strictly equal to:', expected)
				];

				fail(this, new AssertionError({
					assertion: 'is',
					message,
					operator: '===',
					values
				}));
			}
		},

		not(actual, expected, message) {
			if (actual === expected) {
				fail(this, new AssertionError({
					assertion: 'not',
					message,
					operator: '!==',
					values: [formatAssertError.formatWithLabel('Value is strictly equal:', actual)]
				}));
			} else {
				pass(this);
			}
		},

		deepEqual(actual, expected, message) {
			if (deepEqual(actual, expected)) {
				pass(this);
			} else {
				const diff = formatAssertError.formatDiff(actual, expected);
				const values = diff ? [diff] : [
					formatAssertError.formatWithLabel('Actual:', actual),
					formatAssertError.formatWithLabel('Must be deeply equal to:', expected)
				];

				fail(this, new AssertionError({
					assertion: 'deepEqual',
					message,
					values
				}));
			}
		},

		notDeepEqual(actual, expected, message) {
			if (deepEqual(actual, expected)) {
				fail(this, new AssertionError({
					assertion: 'notDeepEqual',
					message,
					values: [formatAssertError.formatWithLabel('Value is deeply equal:', actual)]
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
					assertion: 'throws',
					improperUsage: true,
					message: '`t.throws()` must be called with a function, Promise, or Observable',
					values: [formatAssertError.formatWithLabel('Called with:', fn)]
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

			const test = (fn, stack) => {
				let actual;
				let threw = false;
				try {
					coreAssert.throws(() => {
						try {
							fn();
						} catch (err) {
							actual = err;
							threw = true;
							throw err;
						}
					}, coreAssertThrowsErrorArg);
					return actual;
				} catch (err) {
					const values = threw ?
						[formatAssertError.formatWithLabel('Threw unexpected exception:', actual)] :
						null;

					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values
					});
				}
			};

			if (promise) {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = promise.then(makeNoop, makeRethrow).then(fn => test(fn, stack));
				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
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
					assertion: 'notThrows',
					improperUsage: true,
					message: '`t.notThrows()` must be called with a function, Promise, or Observable',
					values: [formatAssertError.formatWithLabel('Called with:', fn)]
				}));
				return;
			}

			const test = (fn, stack) => {
				try {
					coreAssert.doesNotThrow(fn);
				} catch (err) {
					throw new AssertionError({
						assertion: 'notThrows',
						message,
						stack,
						values: [formatAssertError.formatWithLabel('Threw:', err.actual)]
					});
				}
			};

			if (promise) {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = promise.then(noop, reason => test(makeRethrow(reason), stack));
				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
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
					assertion: 'ifError',
					message,
					values: [formatAssertError.formatWithLabel('Error:', actual)]
				}));
			} else {
				pass(this);
			}
		},

		snapshot(actual, message) {
			const state = this._test.getSnapshotState();
			const result = state.match(this.title, actual);
			if (result.pass) {
				pass(this);
			} else {
				const diff = jestDiff(result.expected.trim(), result.actual.trim(), {expand: true})
					// Remove annotation
					.split('\n')
					.slice(3)
					.join('\n');
				fail(this, new AssertionError({
					assertion: 'snapshot',
					message: message || 'Did not match snapshot',
					values: [{label: 'Difference:', formatted: diff}]
				}));
			}
		}
	};

	const enhancedAssertions = enhanceAssert(pass, fail, {
		truthy(actual, message) {
			if (!actual) {
				throw new AssertionError({
					assertion: 'truthy',
					message,
					operator: '!!',
					values: [formatAssertError.formatWithLabel('Value is not truthy:', actual)]
				});
			}
		},

		falsy(actual, message) {
			if (actual) {
				throw new AssertionError({
					assertion: 'falsy',
					message,
					operator: '!',
					values: [formatAssertError.formatWithLabel('Value is not falsy:', actual)]
				});
			}
		},

		true(actual, message) {
			if (actual !== true) {
				throw new AssertionError({
					assertion: 'true',
					message,
					values: [formatAssertError.formatWithLabel('Value is not `true`:', actual)]
				});
			}
		},

		false(actual, message) {
			if (actual !== false) {
				throw new AssertionError({
					assertion: 'false',
					message,
					values: [formatAssertError.formatWithLabel('Value is not `false`:', actual)]
				});
			}
		},

		regex(string, regex, message) {
			if (typeof string !== 'string') {
				throw new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a string',
					values: [formatAssertError.formatWithLabel('Called with:', string)]
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a regular expression',
					values: [formatAssertError.formatWithLabel('Called with:', regex)]
				});
			}

			if (!regex.test(string)) {
				throw new AssertionError({
					assertion: 'regex',
					message,
					values: [
						formatAssertError.formatWithLabel('Value must match expression:', string),
						formatAssertError.formatWithLabel('Regular expression:', regex)
					]
				});
			}
		},

		notRegex(string, regex, message) {
			if (typeof string !== 'string') {
				throw new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a string',
					values: [formatAssertError.formatWithLabel('Called with:', string)]
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a regular expression',
					values: [formatAssertError.formatWithLabel('Called with:', regex)]
				});
			}

			if (regex.test(string)) {
				throw new AssertionError({
					assertion: 'notRegex',
					message,
					values: [
						formatAssertError.formatWithLabel('Value must not match expression:', string),
						formatAssertError.formatWithLabel('Regular expression:', regex)
					]
				});
			}
		}
	});

	return Object.assign(assertions, enhancedAssertions);
}
exports.wrapAssertions = wrapAssertions;
