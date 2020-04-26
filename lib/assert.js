'use strict';
const concordance = require('concordance');
const isError = require('is-error');
const isPromise = require('is-promise');
const concordanceOptions = require('./concordance-options').default;
const concordanceDiffOptions = require('./concordance-options').diff;
const snapshotManager = require('./snapshot-manager');

function formatDescriptorDiff(actualDescriptor, expectedDescriptor, options) {
	options = {...options, ...concordanceDiffOptions};
	return {
		label: 'Difference:',
		formatted: concordance.diffDescriptors(actualDescriptor, expectedDescriptor, options)
	};
}

function formatDescriptorWithLabel(label, descriptor) {
	return {
		label,
		formatted: concordance.formatDescriptor(descriptor, concordanceOptions)
	};
}

function formatWithLabel(label, value) {
	return formatDescriptorWithLabel(label, concordance.describe(value, concordanceOptions));
}

function formatPowerAssertValue(value) {
	return concordance.format(value, concordanceOptions);
}

const hasOwnProperty = (object, prop) => Object.prototype.hasOwnProperty.call(object, prop);
const noop = () => {};
const notImplemented = () => {
	throw new Error('not implemented');
};

class AssertionError extends Error {
	constructor(options) {
		super(options.message || '');
		this.name = 'AssertionError';

		this.assertion = options.assertion;
		this.fixedSource = options.fixedSource;
		this.improperUsage = options.improperUsage || false;
		this.actualStack = options.actualStack;
		this.operator = options.operator;
		this.values = options.values || [];

		// Raw expected and actual objects are stored for custom reporters
		// (such as wallaby.js), that manage worker processes directly and
		// use the values for custom diff views
		this.raw = options.raw;

		// Reserved for power-assert statements
		this.statements = [];

		if (options.savedError) {
			this.savedError = options.savedError;
		} else {
			this.savedError = getErrorWithLongStackTrace();
		}
	}
}
exports.AssertionError = AssertionError;

function getErrorWithLongStackTrace() {
	const limitBefore = Error.stackTraceLimit;
	Error.stackTraceLimit = Infinity;
	const err = new Error();
	Error.stackTraceLimit = limitBefore;
	return err;
}

function validateExpectations(assertion, expectations, numberArgs) { // eslint-disable-line complexity
	if (numberArgs === 1 || expectations === null || expectations === undefined) {
		expectations = {};
	} else if (
		typeof expectations === 'function' ||
		typeof expectations === 'string' ||
		expectations instanceof RegExp ||
		typeof expectations !== 'object' ||
		Array.isArray(expectations) ||
		Object.keys(expectations).length === 0
	) {
		throw new AssertionError({
			assertion,
			message: `The second argument to \`t.${assertion}()\` must be an expectation object, \`null\` or \`undefined\``,
			values: [formatWithLabel('Called with:', expectations)]
		});
	} else {
		if (hasOwnProperty(expectations, 'instanceOf') && typeof expectations.instanceOf !== 'function') {
			throw new AssertionError({
				assertion,
				message: `The \`instanceOf\` property of the second argument to \`t.${assertion}()\` must be a function`,
				values: [formatWithLabel('Called with:', expectations)]
			});
		}

		if (hasOwnProperty(expectations, 'message') && typeof expectations.message !== 'string' && !(expectations.message instanceof RegExp)) {
			throw new AssertionError({
				assertion,
				message: `The \`message\` property of the second argument to \`t.${assertion}()\` must be a string or regular expression`,
				values: [formatWithLabel('Called with:', expectations)]
			});
		}

		if (hasOwnProperty(expectations, 'name') && typeof expectations.name !== 'string') {
			throw new AssertionError({
				assertion,
				message: `The \`name\` property of the second argument to \`t.${assertion}()\` must be a string`,
				values: [formatWithLabel('Called with:', expectations)]
			});
		}

		if (hasOwnProperty(expectations, 'code') && typeof expectations.code !== 'string' && typeof expectations.code !== 'number') {
			throw new AssertionError({
				assertion,
				message: `The \`code\` property of the second argument to \`t.${assertion}()\` must be a string or number`,
				values: [formatWithLabel('Called with:', expectations)]
			});
		}

		for (const key of Object.keys(expectations)) {
			switch (key) {
				case 'instanceOf':
				case 'is':
				case 'message':
				case 'name':
				case 'code':
					continue;
				default:
					throw new AssertionError({
						assertion,
						message: `The second argument to \`t.${assertion}()\` contains unexpected properties`,
						values: [formatWithLabel('Called with:', expectations)]
					});
			}
		}
	}

	return expectations;
}

// Note: this function *must* throw exceptions, since it can be used
// as part of a pending assertion for promises.
function assertExpectations({assertion, actual, expectations, message, prefix, savedError}) {
	if (!isError(actual)) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			values: [formatWithLabel(`${prefix} exception that is not an error:`, actual)]
		});
	}

	const actualStack = actual.stack;

	if (hasOwnProperty(expectations, 'is') && actual !== expectations.is) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected to be strictly equal to:', expectations.is)
			]
		});
	}

	if (expectations.instanceOf && !(actual instanceof expectations.instanceOf)) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected instance of:', expectations.instanceOf)
			]
		});
	}

	if (typeof expectations.name === 'string' && actual.name !== expectations.name) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected name to equal:', expectations.name)
			]
		});
	}

	if (typeof expectations.message === 'string' && actual.message !== expectations.message) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected message to equal:', expectations.message)
			]
		});
	}

	if (expectations.message instanceof RegExp && !expectations.message.test(actual.message)) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected message to match:', expectations.message)
			]
		});
	}

	if (typeof expectations.code !== 'undefined' && actual.code !== expectations.code) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected code to equal:', expectations.code)
			]
		});
	}
}

class Assertions {
	constructor({
		pass = notImplemented,
		pending = notImplemented,
		fail = notImplemented,
		skip = notImplemented,
		compareWithSnapshot = notImplemented,
		powerAssert
	} = {}) {
		const withSkip = assertionFn => {
			assertionFn.skip = skip;
			return assertionFn;
		};

		// When adding new enhanced functions with new patterns, don't forget to
		// enable the pattern in the power-assert compilation step in @ava/babel.
		const withPowerAssert = (pattern, assertionFn) => powerAssert.empower(assertionFn, {
			onError: event => {
				if (event.powerAssertContext) {
					event.error.statements = powerAssert.format(event.powerAssertContext, formatPowerAssertValue);
				}

				fail(event.error);
			},
			onSuccess: () => {
				pass();
			},
			bindReceiver: false,
			patterns: [pattern]
		});

		const checkMessage = (assertion, message, powerAssert = false) => {
			if (typeof message === 'undefined' || typeof message === 'string') {
				return true;
			}

			const error = new AssertionError({
				assertion,
				improperUsage: true,
				message: 'The assertion message must be a string',
				values: [formatWithLabel('Called with:', message)]
			});

			if (powerAssert) {
				throw error;
			}

			fail(error);
			return false;
		};

		this.pass = withSkip(() => {
			pass();
		});

		this.fail = withSkip(message => {
			if (!checkMessage('fail', message)) {
				return;
			}

			fail(new AssertionError({
				assertion: 'fail',
				message: message || 'Test failed via `t.fail()`'
			}));
		});

		this.is = withSkip((actual, expected, message) => {
			if (!checkMessage('is', message)) {
				return;
			}

			if (Object.is(actual, expected)) {
				pass();
			} else {
				const result = concordance.compare(actual, expected, concordanceOptions);
				const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
				const expectedDescriptor = result.expected || concordance.describe(expected, concordanceOptions);

				if (result.pass) {
					fail(new AssertionError({
						assertion: 'is',
						message,
						raw: {actual, expected},
						values: [formatDescriptorWithLabel('Values are deeply equal to each other, but they are not the same:', actualDescriptor)]
					}));
				} else {
					fail(new AssertionError({
						assertion: 'is',
						message,
						raw: {actual, expected},
						values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)]
					}));
				}
			}
		});

		this.not = withSkip((actual, expected, message) => {
			if (!checkMessage('not', message)) {
				return;
			}

			if (Object.is(actual, expected)) {
				fail(new AssertionError({
					assertion: 'not',
					message,
					raw: {actual, expected},
					values: [formatWithLabel('Value is the same as:', actual)]
				}));
			} else {
				pass();
			}
		});

		this.deepEqual = withSkip((actual, expected, message) => {
			if (!checkMessage('deepEqual', message)) {
				return;
			}

			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				pass();
			} else {
				const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
				const expectedDescriptor = result.expected || concordance.describe(expected, concordanceOptions);
				fail(new AssertionError({
					assertion: 'deepEqual',
					message,
					raw: {actual, expected},
					values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)]
				}));
			}
		});

		this.notDeepEqual = withSkip((actual, expected, message) => {
			if (!checkMessage('notDeepEqual', message)) {
				return;
			}

			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
				fail(new AssertionError({
					assertion: 'notDeepEqual',
					message,
					raw: {actual, expected},
					values: [formatDescriptorWithLabel('Value is deeply equal:', actualDescriptor)]
				}));
			} else {
				pass();
			}
		});

		this.throws = withSkip((...args) => {
			// Since arrow functions do not support 'arguments', we are using rest
			// operator, so we can determine the total number of arguments passed
			// to the function.
			let [fn, expectations, message] = args;

			if (!checkMessage('throws', message)) {
				return;
			}

			if (typeof fn !== 'function') {
				fail(new AssertionError({
					assertion: 'throws',
					improperUsage: true,
					message: '`t.throws()` must be called with a function',
					values: [formatWithLabel('Called with:', fn)]
				}));
				return;
			}

			try {
				expectations = validateExpectations('throws', expectations, args.length);
			} catch (error) {
				fail(error);
				return;
			}

			let retval;
			let actual = null;
			try {
				retval = fn();
				if (isPromise(retval)) {
					// Here isPromise() checks if something is "promise like". Cast to an actual promise.
					Promise.resolve(retval).catch(noop);
					fail(new AssertionError({
						assertion: 'throws',
						message,
						values: [formatWithLabel('Function returned a promise. Use `t.throwsAsync()` instead:', retval)]
					}));
					return;
				}
			} catch (error) {
				actual = error;
			}

			if (!actual) {
				fail(new AssertionError({
					assertion: 'throws',
					message,
					values: [formatWithLabel('Function returned:', retval)]
				}));
				return;
			}

			try {
				assertExpectations({
					assertion: 'throws',
					actual,
					expectations,
					message,
					prefix: 'Function threw'
				});
				pass();
				return actual;
			} catch (error) {
				fail(error);
			}
		});

		this.throwsAsync = withSkip((...args) => {
			let [thrower, expectations, message] = args;

			if (!checkMessage('throwsAsync', message)) {
				return Promise.resolve();
			}

			if (typeof thrower !== 'function' && !isPromise(thrower)) {
				fail(new AssertionError({
					assertion: 'throwsAsync',
					improperUsage: true,
					message: '`t.throwsAsync()` must be called with a function or promise',
					values: [formatWithLabel('Called with:', thrower)]
				}));
				return Promise.resolve();
			}

			try {
				expectations = validateExpectations('throwsAsync', expectations, args.length);
			} catch (error) {
				fail(error);
				return Promise.resolve();
			}

			const handlePromise = (promise, wasReturned) => {
				// Create an error object to record the stack before it gets lost in the promise chain.
				const savedError = getErrorWithLongStackTrace();
				// Handle "promise like" objects by casting to a real Promise.
				const intermediate = Promise.resolve(promise).then(value => { // eslint-disable-line promise/prefer-await-to-then
					throw new AssertionError({
						assertion: 'throwsAsync',
						message,
						savedError,
						values: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} resolved with:`, value)]
					});
				}, error => {
					assertExpectations({
						assertion: 'throwsAsync',
						actual: error,
						expectations,
						message,
						prefix: `${wasReturned ? 'Returned promise' : 'Promise'} rejected with`,
						savedError
					});
					return error;
				});

				pending(intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			};

			if (isPromise(thrower)) {
				return handlePromise(thrower, false);
			}

			let retval;
			let actual = null;
			try {
				retval = thrower();
			} catch (error) {
				actual = error;
			}

			if (actual) {
				fail(new AssertionError({
					assertion: 'throwsAsync',
					message,
					actualStack: actual.stack,
					values: [formatWithLabel('Function threw synchronously. Use `t.throws()` instead:', actual)]
				}));
				return Promise.resolve();
			}

			if (isPromise(retval)) {
				return handlePromise(retval, true);
			}

			fail(new AssertionError({
				assertion: 'throwsAsync',
				message,
				values: [formatWithLabel('Function returned:', retval)]
			}));
			return Promise.resolve();
		});

		this.notThrows = withSkip((fn, message) => {
			if (!checkMessage('notThrows', message)) {
				return;
			}

			if (typeof fn !== 'function') {
				fail(new AssertionError({
					assertion: 'notThrows',
					improperUsage: true,
					message: '`t.notThrows()` must be called with a function',
					values: [formatWithLabel('Called with:', fn)]
				}));
				return;
			}

			try {
				fn();
			} catch (error) {
				fail(new AssertionError({
					assertion: 'notThrows',
					message,
					actualStack: error.stack,
					values: [formatWithLabel('Function threw:', error)]
				}));
				return;
			}

			pass();
		});

		this.notThrowsAsync = withSkip((nonThrower, message) => {
			if (!checkMessage('notThrowsAsync', message)) {
				return Promise.resolve();
			}

			if (typeof nonThrower !== 'function' && !isPromise(nonThrower)) {
				fail(new AssertionError({
					assertion: 'notThrowsAsync',
					improperUsage: true,
					message: '`t.notThrowsAsync()` must be called with a function or promise',
					values: [formatWithLabel('Called with:', nonThrower)]
				}));
				return Promise.resolve();
			}

			const handlePromise = (promise, wasReturned) => {
				// Create an error object to record the stack before it gets lost in the promise chain.
				const savedError = getErrorWithLongStackTrace();
				// Handle "promise like" objects by casting to a real Promise.
				const intermediate = Promise.resolve(promise).then(noop, error => { // eslint-disable-line promise/prefer-await-to-then
					throw new AssertionError({
						assertion: 'notThrowsAsync',
						message,
						savedError,
						values: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} rejected with:`, error)]
					});
				});
				pending(intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			};

			if (isPromise(nonThrower)) {
				return handlePromise(nonThrower, false);
			}

			let retval;
			try {
				retval = nonThrower();
			} catch (error) {
				fail(new AssertionError({
					assertion: 'notThrowsAsync',
					message,
					actualStack: error.stack,
					values: [formatWithLabel('Function threw:', error)]
				}));
				return Promise.resolve();
			}

			if (!isPromise(retval)) {
				fail(new AssertionError({
					assertion: 'notThrowsAsync',
					message,
					values: [formatWithLabel('Function did not return a promise. Use `t.notThrows()` instead:', retval)]
				}));
				return Promise.resolve();
			}

			return handlePromise(retval, true);
		});

		this.snapshot = withSkip((expected, ...rest) => {
			let message;
			let snapshotOptions;
			if (rest.length > 1) {
				[snapshotOptions, message] = rest;
			} else {
				const [optionsOrMessage] = rest;
				if (typeof optionsOrMessage === 'object') {
					snapshotOptions = optionsOrMessage;
				} else {
					message = optionsOrMessage;
				}
			}

			if (!checkMessage('snapshot', message)) {
				return;
			}

			let result;
			try {
				result = compareWithSnapshot({
					expected,
					id: snapshotOptions ? snapshotOptions.id : undefined,
					message
				});
			} catch (error) {
				if (!(error instanceof snapshotManager.SnapshotError)) {
					throw error;
				}

				const improperUsage = {name: error.name, snapPath: error.snapPath};
				if (error instanceof snapshotManager.VersionMismatchError) {
					improperUsage.snapVersion = error.snapVersion;
					improperUsage.expectedVersion = error.expectedVersion;
				}

				fail(new AssertionError({
					assertion: 'snapshot',
					message: message || 'Could not compare snapshot',
					improperUsage
				}));
				return;
			}

			if (result.pass) {
				pass();
			} else if (result.actual) {
				fail(new AssertionError({
					assertion: 'snapshot',
					message: message || 'Did not match snapshot',
					values: [formatDescriptorDiff(result.actual, result.expected, {invert: true})]
				}));
			} else {
				// This can only occur in CI environments.
				fail(new AssertionError({
					assertion: 'snapshot',
					message: message || 'No snapshot available — new snapshots are not created in CI environments'
				}));
			}
		});

		this.truthy = withSkip((actual, message) => {
			if (!checkMessage('truthy', message)) {
				return;
			}

			if (actual) {
				pass();
			} else {
				fail(new AssertionError({
					assertion: 'truthy',
					message,
					operator: '!!',
					values: [formatWithLabel('Value is not truthy:', actual)]
				}));
			}
		});

		this.falsy = withSkip((actual, message) => {
			if (!checkMessage('falsy', message)) {
				return;
			}

			if (actual) {
				fail(new AssertionError({
					assertion: 'falsy',
					message,
					operator: '!',
					values: [formatWithLabel('Value is not falsy:', actual)]
				}));
			} else {
				pass();
			}
		});

		this.true = withSkip((actual, message) => {
			if (!checkMessage('true', message)) {
				return;
			}

			if (actual === true) {
				pass();
			} else {
				fail(new AssertionError({
					assertion: 'true',
					message,
					values: [formatWithLabel('Value is not `true`:', actual)]
				}));
			}
		});

		this.false = withSkip((actual, message) => {
			if (!checkMessage('false', message)) {
				return;
			}

			if (actual === false) {
				pass();
			} else {
				fail(new AssertionError({
					assertion: 'false',
					message,
					values: [formatWithLabel('Value is not `false`:', actual)]
				}));
			}
		});

		this.regex = withSkip((string, regex, message) => {
			if (!checkMessage('regex', message)) {
				return;
			}

			if (typeof string !== 'string') {
				fail(new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a string',
					values: [formatWithLabel('Called with:', string)]
				}));
				return;
			}

			if (!(regex instanceof RegExp)) {
				fail(new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)]
				}));
				return;
			}

			if (!regex.test(string)) {
				fail(new AssertionError({
					assertion: 'regex',
					message,
					values: [
						formatWithLabel('Value must match expression:', string),
						formatWithLabel('Regular expression:', regex)
					]
				}));
				return;
			}

			pass();
		});

		this.notRegex = withSkip((string, regex, message) => {
			if (!checkMessage('notRegex', message)) {
				return;
			}

			if (typeof string !== 'string') {
				fail(new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a string',
					values: [formatWithLabel('Called with:', string)]
				}));
				return;
			}

			if (!(regex instanceof RegExp)) {
				fail(new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)]
				}));
				return;
			}

			if (regex.test(string)) {
				fail(new AssertionError({
					assertion: 'notRegex',
					message,
					values: [
						formatWithLabel('Value must not match expression:', string),
						formatWithLabel('Regular expression:', regex)
					]
				}));
				return;
			}

			pass();
		});

		if (powerAssert === undefined) {
			this.assert = withSkip((actual, message) => {
				if (!checkMessage('assert', message)) {
					return;
				}

				if (!actual) {
					fail(new AssertionError({
						assertion: 'assert',
						message,
						operator: '!!',
						values: [formatWithLabel('Value is not truthy:', actual)]
					}));
					return;
				}

				pass();
			});
		} else {
			this.assert = withSkip(withPowerAssert(
				'assert(value, [message])',
				(actual, message) => {
					checkMessage('assert', message, true);

					if (!actual) {
						throw new AssertionError({
							assertion: 'assert',
							message,
							operator: '!!',
							values: [formatWithLabel('Value is not truthy:', actual)]
						});
					}
				})
			);
		}
	}
}
exports.Assertions = Assertions;
