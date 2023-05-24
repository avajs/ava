import concordance from 'concordance';
import isError from 'is-error';
import isPromise from 'is-promise';

import concordanceOptions from './concordance-options.js';
import {CIRCULAR_SELECTOR, isLikeSelector, selectComparable} from './like-selector.js';
import {SnapshotError, VersionMismatchError} from './snapshot-manager.js';

function formatDescriptorDiff(actualDescriptor, expectedDescriptor, options) {
	options = {...options, ...concordanceOptions};
	const {diffGutters} = options.theme;
	const {insertLine, deleteLine} = options.theme.string.diff;
	return {
		label: `Difference (${diffGutters.actual}${deleteLine.open}actual${deleteLine.close}, ${diffGutters.expected}${insertLine.open}expected${insertLine.close}):`,
		formatted: concordance.diffDescriptors(actualDescriptor, expectedDescriptor, options),
	};
}

function formatDescriptorWithLabel(label, descriptor) {
	return {
		label,
		formatted: concordance.formatDescriptor(descriptor, concordanceOptions),
	};
}

function formatWithLabel(label, value) {
	return formatDescriptorWithLabel(label, concordance.describe(value, concordanceOptions));
}

const hasOwnProperty = (object, prop) => Object.prototype.hasOwnProperty.call(object, prop);
const noop = () => {};
const notImplemented = () => {
	throw new Error('not implemented');
};

export class AssertionError extends Error {
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

		this.savedError = options.savedError || getErrorWithLongStackTrace();
	}
}

export function checkAssertionMessage(assertion, message) {
	if (message === undefined || typeof message === 'string') {
		return true;
	}

	return new AssertionError({
		assertion,
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [formatWithLabel('Called with:', message)],
	});
}

function getErrorWithLongStackTrace() {
	const limitBefore = Error.stackTraceLimit;
	Error.stackTraceLimit = Number.POSITIVE_INFINITY;
	const error = new Error(); // eslint-disable-line unicorn/error-message
	Error.stackTraceLimit = limitBefore;
	return error;
}

function validateExpectations(assertion, expectations, numberArgs) { // eslint-disable-line complexity
	if (numberArgs === 1 || expectations === null || expectations === undefined) {
		if (expectations === null) {
			throw new AssertionError({
				assertion,
				message: `The second argument to \`t.${assertion}()\` must be an expectation object or \`undefined\``,
				values: [formatWithLabel('Called with:', expectations)],
			});
		}

		expectations = {};
	} else if (
		typeof expectations === 'function'
		|| typeof expectations === 'string'
		|| expectations instanceof RegExp
		|| typeof expectations !== 'object'
		|| Array.isArray(expectations)
		|| Object.keys(expectations).length === 0
	) {
		throw new AssertionError({
			assertion,
			message: `The second argument to \`t.${assertion}()\` must be an expectation object, \`null\` or \`undefined\``,
			values: [formatWithLabel('Called with:', expectations)],
		});
	} else {
		if (hasOwnProperty(expectations, 'instanceOf') && typeof expectations.instanceOf !== 'function') {
			throw new AssertionError({
				assertion,
				message: `The \`instanceOf\` property of the second argument to \`t.${assertion}()\` must be a function`,
				values: [formatWithLabel('Called with:', expectations)],
			});
		}

		if (
			hasOwnProperty(expectations, 'message')
			&& typeof expectations.message !== 'string'
			&& !(expectations.message instanceof RegExp)
			&& !(typeof expectations.message === 'function')
		) {
			throw new AssertionError({
				assertion,
				message: `The \`message\` property of the second argument to \`t.${assertion}()\` must be a string, regular expression or a function`,
				values: [formatWithLabel('Called with:', expectations)],
			});
		}

		if (hasOwnProperty(expectations, 'name') && typeof expectations.name !== 'string') {
			throw new AssertionError({
				assertion,
				message: `The \`name\` property of the second argument to \`t.${assertion}()\` must be a string`,
				values: [formatWithLabel('Called with:', expectations)],
			});
		}

		if (hasOwnProperty(expectations, 'code') && typeof expectations.code !== 'string' && typeof expectations.code !== 'number') {
			throw new AssertionError({
				assertion,
				message: `The \`code\` property of the second argument to \`t.${assertion}()\` must be a string or number`,
				values: [formatWithLabel('Called with:', expectations)],
			});
		}

		for (const key of Object.keys(expectations)) {
			switch (key) {
				case 'instanceOf':
				case 'is':
				case 'message':
				case 'name':
				case 'code': {
					continue;
				}

				default: {
					throw new AssertionError({
						assertion,
						message: `The second argument to \`t.${assertion}()\` contains unexpected properties`,
						values: [formatWithLabel('Called with:', expectations)],
					});
				}
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
			values: [formatWithLabel(`${prefix} exception that is not an error:`, actual)],
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
				formatWithLabel('Expected to be strictly equal to:', expectations.is),
			],
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
				formatWithLabel('Expected instance of:', expectations.instanceOf),
			],
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
				formatWithLabel('Expected name to equal:', expectations.name),
			],
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
				formatWithLabel('Expected message to equal:', expectations.message),
			],
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
				formatWithLabel('Expected message to match:', expectations.message),
			],
		});
	}

	if (typeof expectations.message === 'function' && expectations.message(actual.message) === false) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected message to return true:', expectations.message),
			],
		});
	}

	if (expectations.code !== undefined && actual.code !== expectations.code) {
		throw new AssertionError({
			assertion,
			message,
			savedError,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected code to equal:', expectations.code),
			],
		});
	}
}

export class Assertions {
	constructor({
		pass = notImplemented,
		pending = notImplemented,
		fail = notImplemented,
		skip = notImplemented,
		compareWithSnapshot = notImplemented,
		experiments = {},
		disableSnapshots = false,
	} = {}) {
		const withSkip = assertionFn => {
			assertionFn.skip = skip;
			return assertionFn;
		};

		const checkMessage = (assertion, message) => {
			const result = checkAssertionMessage(assertion, message);
			if (result === true) {
				return true;
			}

			fail(result);
			return false;
		};

		this.pass = withSkip(() => {
			pass();
			return true;
		});

		this.fail = withSkip(message => {
			if (!checkMessage('fail', message)) {
				return false;
			}

			fail(new AssertionError({
				assertion: 'fail',
				message: message || 'Test failed via `t.fail()`',
			}));

			return false;
		});

		this.is = withSkip((actual, expected, message) => {
			if (!checkMessage('is', message)) {
				return false;
			}

			if (Object.is(actual, expected)) {
				pass();
				return true;
			}

			const result = concordance.compare(actual, expected, concordanceOptions);
			const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
			const expectedDescriptor = result.expected || concordance.describe(expected, concordanceOptions);

			if (result.pass) {
				fail(new AssertionError({
					assertion: 'is',
					message,
					raw: {actual, expected},
					values: [formatDescriptorWithLabel('Values are deeply equal to each other, but they are not the same:', actualDescriptor)],
				}));
			} else {
				fail(new AssertionError({
					assertion: 'is',
					message,
					raw: {actual, expected},
					values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)],
				}));
			}

			return false;
		});

		this.not = withSkip((actual, expected, message) => {
			if (!checkMessage('not', message)) {
				return false;
			}

			if (Object.is(actual, expected)) {
				fail(new AssertionError({
					assertion: 'not',
					message,
					raw: {actual, expected},
					values: [formatWithLabel('Value is the same as:', actual)],
				}));
				return false;
			}

			pass();
			return true;
		});

		this.deepEqual = withSkip((actual, expected, message) => {
			if (!checkMessage('deepEqual', message)) {
				return false;
			}

			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				pass();
				return true;
			}

			const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
			const expectedDescriptor = result.expected || concordance.describe(expected, concordanceOptions);
			fail(new AssertionError({
				assertion: 'deepEqual',
				message,
				raw: {actual, expected},
				values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)],
			}));
			return false;
		});

		this.notDeepEqual = withSkip((actual, expected, message) => {
			if (!checkMessage('notDeepEqual', message)) {
				return false;
			}

			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
				fail(new AssertionError({
					assertion: 'notDeepEqual',
					message,
					raw: {actual, expected},
					values: [formatDescriptorWithLabel('Value is deeply equal:', actualDescriptor)],
				}));
				return false;
			}

			pass();
			return true;
		});

		this.like = withSkip((actual, selector, message) => {
			if (!checkMessage('like', message)) {
				return false;
			}

			if (!isLikeSelector(selector)) {
				fail(new AssertionError({
					assertion: 'like',
					improperUsage: true,
					message: '`t.like()` selector must be a non-empty object',
					values: [formatWithLabel('Called with:', selector)],
				}));
				return false;
			}

			let comparable;
			try {
				comparable = selectComparable(actual, selector);
			} catch (error) {
				if (error === CIRCULAR_SELECTOR) {
					fail(new AssertionError({
						assertion: 'like',
						improperUsage: true,
						message: '`t.like()` selector must not contain circular references',
						values: [formatWithLabel('Called with:', selector)],
					}));
					return false;
				}

				throw error;
			}

			const result = concordance.compare(comparable, selector, concordanceOptions);
			if (result.pass) {
				pass();
				return true;
			}

			const actualDescriptor = result.actual || concordance.describe(comparable, concordanceOptions);
			const expectedDescriptor = result.expected || concordance.describe(selector, concordanceOptions);
			fail(new AssertionError({
				assertion: 'like',
				message,
				values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)],
			}));

			return false;
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
					values: [formatWithLabel('Called with:', fn)],
				}));
				return;
			}

			try {
				expectations = validateExpectations('throws', expectations, args.length, experiments);
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
						values: [formatWithLabel('Function returned a promise. Use `t.throwsAsync()` instead:', retval)],
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
					values: [formatWithLabel('Function returned:', retval)],
				}));
				return;
			}

			try {
				assertExpectations({
					assertion: 'throws',
					actual,
					expectations,
					message,
					prefix: 'Function threw',
				});
				pass();
				return actual;
			} catch (error) {
				fail(error);
			}
		});

		this.throwsAsync = withSkip(async (...args) => {
			let [thrower, expectations, message] = args;

			if (!checkMessage('throwsAsync', message)) {
				return;
			}

			if (typeof thrower !== 'function' && !isPromise(thrower)) {
				fail(new AssertionError({
					assertion: 'throwsAsync',
					improperUsage: true,
					message: '`t.throwsAsync()` must be called with a function or promise',
					values: [formatWithLabel('Called with:', thrower)],
				}));
				return;
			}

			try {
				expectations = validateExpectations('throwsAsync', expectations, args.length, experiments);
			} catch (error) {
				fail(error);
				return;
			}

			const handlePromise = async (promise, wasReturned) => {
				// Create an error object to record the stack before it gets lost in the promise chain.
				const savedError = getErrorWithLongStackTrace();
				// Handle "promise like" objects by casting to a real Promise.
				const intermediate = Promise.resolve(promise).then(value => {
					throw new AssertionError({
						assertion: 'throwsAsync',
						message,
						savedError,
						values: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} resolved with:`, value)],
					});
				}, error => {
					assertExpectations({
						assertion: 'throwsAsync',
						actual: error,
						expectations,
						message,
						prefix: `${wasReturned ? 'Returned promise' : 'Promise'} rejected with`,
						savedError,
					});
					return error;
				});

				pending(intermediate);
				try {
					return await intermediate;
				} catch {
					// Don't reject the returned promise, even if the assertion fails.
				}
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
					values: [formatWithLabel('Function threw synchronously. Use `t.throws()` instead:', actual)],
				}));
				return;
			}

			if (isPromise(retval)) {
				return handlePromise(retval, true);
			}

			fail(new AssertionError({
				assertion: 'throwsAsync',
				message,
				values: [formatWithLabel('Function returned:', retval)],
			}));
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
					values: [formatWithLabel('Called with:', fn)],
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
					values: [formatWithLabel('Function threw:', error)],
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
					values: [formatWithLabel('Called with:', nonThrower)],
				}));
				return Promise.resolve();
			}

			const handlePromise = async (promise, wasReturned) => {
				// Create an error object to record the stack before it gets lost in the promise chain.
				const savedError = getErrorWithLongStackTrace();
				// Handle "promise like" objects by casting to a real Promise.
				const intermediate = Promise.resolve(promise).then(noop, error => {
					throw new AssertionError({
						assertion: 'notThrowsAsync',
						message,
						savedError,
						values: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} rejected with:`, error)],
					});
				});
				pending(intermediate);

				try {
					return await intermediate;
				} catch {
					// Don't reject the returned promise, even if the assertion fails.
				}
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
					values: [formatWithLabel('Function threw:', error)],
				}));
				return Promise.resolve();
			}

			if (!isPromise(retval)) {
				fail(new AssertionError({
					assertion: 'notThrowsAsync',
					message,
					values: [formatWithLabel('Function did not return a promise. Use `t.notThrows()` instead:', retval)],
				}));
				return Promise.resolve();
			}

			return handlePromise(retval, true);
		});

		this.snapshot = withSkip((expected, message) => {
			if (disableSnapshots) {
				fail(new AssertionError({
					assertion: 'snapshot',
					message: '`t.snapshot()` can only be used in tests',
					improperUsage: true,
				}));
				return false;
			}

			if (message && message.id !== undefined) {
				fail(new AssertionError({
					assertion: 'snapshot',
					message: 'AVA 4 no longer supports snapshot IDs',
					improperUsage: true,
					values: [formatWithLabel('Called with id:', message.id)],
				}));
				return false;
			}

			if (!checkMessage('snapshot', message)) {
				return false;
			}

			if (message === '') {
				fail(new AssertionError({
					assertion: 'snapshot',
					improperUsage: true,
					message: 'The snapshot assertion message must be a non-empty string',
					values: [formatWithLabel('Called with:', message)],
				}));
				return false;
			}

			let result;
			try {
				result = compareWithSnapshot({expected, message});
			} catch (error) {
				if (!(error instanceof SnapshotError)) {
					throw error;
				}

				const improperUsage = {name: error.name, snapPath: error.snapPath};
				if (error instanceof VersionMismatchError) {
					improperUsage.snapVersion = error.snapVersion;
					improperUsage.expectedVersion = error.expectedVersion;
				}

				fail(new AssertionError({
					assertion: 'snapshot',
					message: message || 'Could not compare snapshot',
					improperUsage,
				}));
				return false;
			}

			if (result.pass) {
				pass();
				return true;
			}

			if (result.actual) {
				fail(new AssertionError({
					assertion: 'snapshot',
					message: message || 'Did not match snapshot',
					values: [formatDescriptorDiff(result.actual, result.expected, {invert: true})],
				}));
			} else {
				// This can only occur in CI environments.
				fail(new AssertionError({
					assertion: 'snapshot',
					message: message || 'No snapshot available — new snapshots are not created in CI environments',
				}));
			}

			return false;
		});

		this.truthy = withSkip((actual, message) => {
			if (!checkMessage('truthy', message)) {
				return false;
			}

			if (actual) {
				pass();
				return true;
			}

			fail(new AssertionError({
				assertion: 'truthy',
				message,
				operator: '!!',
				values: [formatWithLabel('Value is not truthy:', actual)],
			}));
			return false;
		});

		this.falsy = withSkip((actual, message) => {
			if (!checkMessage('falsy', message)) {
				return false;
			}

			if (actual) {
				fail(new AssertionError({
					assertion: 'falsy',
					message,
					operator: '!',
					values: [formatWithLabel('Value is not falsy:', actual)],
				}));
				return false;
			}

			pass();
			return true;
		});

		this.true = withSkip((actual, message) => {
			if (!checkMessage('true', message)) {
				return false;
			}

			if (actual === true) {
				pass();
				return true;
			}

			fail(new AssertionError({
				assertion: 'true',
				message,
				values: [formatWithLabel('Value is not `true`:', actual)],
			}));
			return false;
		});

		this.false = withSkip((actual, message) => {
			if (!checkMessage('false', message)) {
				return false;
			}

			if (actual === false) {
				pass();
				return true;
			}

			fail(new AssertionError({
				assertion: 'false',
				message,
				values: [formatWithLabel('Value is not `false`:', actual)],
			}));
			return false;
		});

		this.regex = withSkip((string, regex, message) => {
			if (!checkMessage('regex', message)) {
				return false;
			}

			if (typeof string !== 'string') {
				fail(new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a string',
					values: [formatWithLabel('Called with:', string)],
				}));
				return false;
			}

			if (!(regex instanceof RegExp)) {
				fail(new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)],
				}));
				return false;
			}

			if (!regex.test(string)) {
				fail(new AssertionError({
					assertion: 'regex',
					message,
					values: [
						formatWithLabel('Value must match expression:', string),
						formatWithLabel('Regular expression:', regex),
					],
				}));
				return false;
			}

			pass();
			return true;
		});

		this.notRegex = withSkip((string, regex, message) => {
			if (!checkMessage('notRegex', message)) {
				return false;
			}

			if (typeof string !== 'string') {
				fail(new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a string',
					values: [formatWithLabel('Called with:', string)],
				}));
				return false;
			}

			if (!(regex instanceof RegExp)) {
				fail(new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)],
				}));
				return false;
			}

			if (regex.test(string)) {
				fail(new AssertionError({
					assertion: 'notRegex',
					message,
					values: [
						formatWithLabel('Value must not match expression:', string),
						formatWithLabel('Regular expression:', regex),
					],
				}));
				return false;
			}

			pass();
			return true;
		});

		this.assert = withSkip((actual, message) => {
			if (!checkMessage('assert', message)) {
				return false;
			}

			if (!actual) {
				fail(new AssertionError({
					assertion: 'assert',
					message,
					operator: '!!',
					values: [formatWithLabel('Value is not truthy:', actual)],
				}));
				return false;
			}

			pass();
			return true;
		});
	}
}
