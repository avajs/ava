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

		// To keep compatibility with old API, don't know if needed
		if (opts.stack) {
			this.stack = opts.stack;
		} else if (opts.callSite) {
			this.stack = opts.callSite.getStack(this.toString());
		}
	}
}
exports.AssertionError = AssertionError;

class CallSite {
	constructor() {
		// This is not lazy in node. However, using pure `Error` instances might not be
		// backwards compatible (nor will it allow us to remove unwanted frames easily).
		Error.captureStackTrace(this, CallSite);
	}

	toString() {
		return '[[CallSite]]';
	}

	getStack(target = '') {
		return this.stack.replace('[[CallSite]]', target);
	}
}
exports.CallSite = CallSite;

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

		fail(message, {callSite} = {}) {
			fail(this, new AssertionError({
				assertion: 'fail',
				message: message || 'Test failed via `t.fail()`',
				callSite
			}));
		},

		is(actual, expected, message, {callSite} = {}) {
			if (Object.is(actual, expected)) {
				pass(this);
			} else {
				const diff = formatAssertError.formatDiff(actual, expected);
				const values = diff ? [diff] : [
					formatAssertError.formatWithLabel('Actual:', actual),
					formatAssertError.formatWithLabel('Must be the same as:', expected)
				];

				fail(this, new AssertionError({
					assertion: 'is',
					message,
					values,
					callSite
				}));
			}
		},

		not(actual, expected, message, {callSite} = {}) {
			if (Object.is(actual, expected)) {
				fail(this, new AssertionError({
					assertion: 'not',
					message,
					values: [formatAssertError.formatWithLabel('Value is the same as:', actual)],
					callSite
				}));
			} else {
				pass(this);
			}
		},

		deepEqual(actual, expected, message, {callSite} = {}) {
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
					values,
					callSite
				}));
			}
		},

		notDeepEqual(actual, expected, message, {callSite} = {}) {
			if (deepEqual(actual, expected)) {
				fail(this, new AssertionError({
					assertion: 'notDeepEqual',
					message,
					values: [formatAssertError.formatWithLabel('Value is deeply equal:', actual)],
					callSite
				}));
			} else {
				pass(this);
			}
		},

		throws(fn, err, message, {callSite} = {}) {
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
					values: [formatAssertError.formatWithLabel('Called with:', fn)],
					callSite
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

			const test = (fn, callSite) => {
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
						callSite,
						values
					});
				}
			};

			if (promise) {
				// Record stack before it gets lost in the promise chain.
				if (!callSite) {
					callSite = new CallSite();
				}

				const intermediate = promise.then(makeNoop, makeRethrow).then(fn => test(fn, callSite));
				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			}

			try {
				const retval = test(fn, callSite);
				pass(this);
				return retval;
			} catch (err) {
				fail(this, err);
			}
		},

		notThrows(fn, message, {callSite} = {}) {
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
					values: [formatAssertError.formatWithLabel('Called with:', fn)],
					callSite
				}));
				return;
			}

			const test = (fn, callSite) => {
				try {
					coreAssert.doesNotThrow(fn);
				} catch (err) {
					throw new AssertionError({
						assertion: 'notThrows',
						message,
						callSite,
						values: [formatAssertError.formatWithLabel('Threw:', err.actual)]
					});
				}
			};

			if (promise) {
				// Record stack before it gets lost in the promise chain.
				if (!callSite) {
					callSite = new CallSite();
				}
				const intermediate = promise.then(noop, reason => test(makeRethrow(reason), callSite));
				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			}

			try {
				test(fn, callSite);
				pass(this);
			} catch (err) {
				fail(this, err);
			}
		},

		ifError(actual, message, {callSite} = {}) {
			if (actual) {
				fail(this, new AssertionError({
					assertion: 'ifError',
					message,
					values: [formatAssertError.formatWithLabel('Error:', actual)],
					callSite
				}));
			} else {
				pass(this);
			}
		},

		snapshot(actual, message, {callSite} = {}) {
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
					values: [{label: 'Difference:', formatted: diff}],
					callSite
				}));
			}
		}
	};

	const enhancedAssertions = enhanceAssert(pass, fail, {
		truthy(actual, message, {callSite} = {}) {
			if (!actual) {
				throw new AssertionError({
					assertion: 'truthy',
					message,
					operator: '!!',
					values: [formatAssertError.formatWithLabel('Value is not truthy:', actual)],
					callSite
				});
			}
		},

		falsy(actual, message, {callSite} = {}) {
			if (actual) {
				throw new AssertionError({
					assertion: 'falsy',
					message,
					operator: '!',
					values: [formatAssertError.formatWithLabel('Value is not falsy:', actual)],
					callSite
				});
			}
		},

		true(actual, message, {callSite} = {}) {
			if (actual !== true) {
				throw new AssertionError({
					assertion: 'true',
					message,
					values: [formatAssertError.formatWithLabel('Value is not `true`:', actual)],
					callSite
				});
			}
		},

		false(actual, message, {callSite} = {}) {
			if (actual !== false) {
				throw new AssertionError({
					assertion: 'false',
					message,
					values: [formatAssertError.formatWithLabel('Value is not `false`:', actual)],
					callSite
				});
			}
		},

		regex(string, regex, message, {callSite} = {}) {
			if (typeof string !== 'string') {
				throw new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a string',
					values: [formatAssertError.formatWithLabel('Called with:', string)],
					callSite
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a regular expression',
					values: [formatAssertError.formatWithLabel('Called with:', regex)],
					callSite
				});
			}

			if (!regex.test(string)) {
				throw new AssertionError({
					assertion: 'regex',
					message,
					values: [
						formatAssertError.formatWithLabel('Value must match expression:', string),
						formatAssertError.formatWithLabel('Regular expression:', regex)
					],
					callSite
				});
			}
		},

		notRegex(string, regex, message, {callSite} = {}) {
			if (typeof string !== 'string') {
				throw new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a string',
					values: [formatAssertError.formatWithLabel('Called with:', string)],
					callSite
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a regular expression',
					values: [formatAssertError.formatWithLabel('Called with:', regex)],
					callSite
				});
			}

			if (regex.test(string)) {
				throw new AssertionError({
					assertion: 'notRegex',
					message,
					values: [
						formatAssertError.formatWithLabel('Value must not match expression:', string),
						formatAssertError.formatWithLabel('Regular expression:', regex)
					],
					callSite
				});
			}
		}
	});

	return Object.assign(assertions, enhancedAssertions);
}
exports.wrapAssertions = wrapAssertions;
