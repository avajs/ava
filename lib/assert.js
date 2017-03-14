'use strict';
const coreAssert = require('core-assert');
const deepEqual = require('lodash.isequal');
const observableToPromise = require('observable-to-promise');
const indentString = require('indent-string');
const isObservable = require('is-observable');
const isPromise = require('is-promise');
const jestSnapshot = require('jest-snapshot');
const enhanceAssert = require('./enhance-assert');
const formatAssertError = require('./format-assert-error');
const snapshotState = require('./snapshot-state');

class AssertionError extends Error {
	constructor(opts) {
		super(opts.message || '');
		this.name = 'AssertionError';

		this.assertion = opts.assertion;
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

			const test = fn => {
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
						values
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
					assertion: 'notThrows',
					message: '`t.notThrows()` must be called with a function, Promise, or Observable',
					values: [formatAssertError.formatWithLabel('Called with:', fn)]
				}));
				return;
			}

			const test = fn => {
				try {
					coreAssert.doesNotThrow(fn);
				} catch (err) {
					throw new AssertionError({
						assertion: 'notThrows',
						message,
						values: [formatAssertError.formatWithLabel('Threw:', err.actual)]
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
					assertion: 'ifError',
					message,
					values: [formatAssertError.formatWithLabel('Error:', actual)]
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
				const diff = formatAssertError.formatDiff(actual, result.expected);
				const values = diff ? [diff] : [
					formatAssertError.formatWithLabel('Actual:', actual),
					formatAssertError.formatWithLabel('Must be deeply equal to:', result.expected)
				];

				fail(this, new AssertionError({
					assertion: 'snapshot',
					message: result.message,
					values
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
					message: '`t.regex()` must be called with a string',
					values: [formatAssertError.formatWithLabel('Called with:', string)]
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'regex',
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
					message: '`t.notRegex()` must be called with a string',
					values: [formatAssertError.formatWithLabel('Called with:', string)]
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'notRegex',
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
