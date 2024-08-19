import {isNativeError} from 'node:util/types';

import concordance from 'concordance';
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

const noop = () => {};
const notImplemented = () => {
	throw new Error('not implemented');
};

export class AssertionError extends Error {
	constructor(message = '', {
		assertion,
		assertionStack = getAssertionStack(AssertionError),
		formattedDetails = [],
		improperUsage = null,
		cause,
	} = {}) {
		super(message, {cause});
		this.name = 'AssertionError';

		this.assertion = assertion;
		this.assertionStack = assertionStack;
		this.improperUsage = improperUsage;
		this.formattedDetails = formattedDetails;
	}
}

export function checkAssertionMessage(message, assertion) {
	if (message === undefined || typeof message === 'string') {
		return true;
	}

	return new AssertionError('The assertion message must be a string', {
		assertion,
		formattedDetails: [formatWithLabel('Called with:', message)],
	});
}

export function getAssertionStack(constructorOpt = getAssertionStack) {
	const {stackTraceLimit: limitBefore} = Error;
	Error.stackTraceLimit = Number.POSITIVE_INFINITY;
	const temporary = {};
	Error.captureStackTrace(temporary, constructorOpt);
	Error.stackTraceLimit = limitBefore;
	return temporary.stack;
}

function validateExpectations(assertion, expectations, numberArgs) { // eslint-disable-line complexity
	if (numberArgs === 1 || expectations === null || expectations === undefined) {
		if (expectations === null) {
			throw new AssertionError(`The second argument to \`${assertion}\` must be an expectation object or \`undefined\``, {
				assertion,
				formattedDetails: [formatWithLabel('Called with:', expectations)],
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
		throw new AssertionError(`The second argument to \`${assertion}\` must be an expectation object, \`null\` or \`undefined\``, {
			assertion,
			formattedDetails: [formatWithLabel('Called with:', expectations)],
		});
	} else {
		if (Object.hasOwn(expectations, 'instanceOf') && typeof expectations.instanceOf !== 'function') {
			throw new AssertionError(`The \`instanceOf\` property of the second argument to \`${assertion}\` must be a function`, {
				assertion,
				formattedDetails: [formatWithLabel('Called with:', expectations)],
			});
		}

		if (
			Object.hasOwn(expectations, 'message')
			&& typeof expectations.message !== 'string'
			&& !(expectations.message instanceof RegExp)
			&& !(typeof expectations.message === 'function')
		) {
			throw new AssertionError(`The \`message\` property of the second argument to \`${assertion}\` must be a string, regular expression or a function`, {
				assertion,
				formattedDetails: [formatWithLabel('Called with:', expectations)],
			});
		}

		if (Object.hasOwn(expectations, 'name') && typeof expectations.name !== 'string') {
			throw new AssertionError(`The \`name\` property of the second argument to \`${assertion}\` must be a string`, {
				assertion,
				formattedDetails: [formatWithLabel('Called with:', expectations)],
			});
		}

		if (Object.hasOwn(expectations, 'code') && typeof expectations.code !== 'string' && typeof expectations.code !== 'number') {
			throw new AssertionError(`The \`code\` property of the second argument to \`${assertion}\` must be a string or number`, {
				assertion,
				formattedDetails: [formatWithLabel('Called with:', expectations)],
			});
		}

		if (Object.hasOwn(expectations, 'any') && typeof expectations.any !== 'boolean') {
			throw new AssertionError(`The \`any\` property of the second argument to \`${assertion}\` must be a boolean`, {
				assertion,
				formattedDetails: [formatWithLabel('Called with:', expectations)],
			});
		}

		for (const key of Object.keys(expectations)) {
			switch (key) {
				case 'instanceOf':
				case 'is':
				case 'message':
				case 'name':
				case 'code':
				case 'any': {
					continue;
				}

				default: {
					throw new AssertionError(`The second argument to \`${assertion}\` contains unexpected properties`, {
						assertion,
						formattedDetails: [formatWithLabel('Called with:', expectations)],
					});
				}
			}
		}
	}

	return expectations;
}

// Note: this function *must* throw exceptions, since it can be used
// as part of a pending assertion for promises.
function assertExpectations({actual, expectations, message, prefix, assertion, assertionStack}) {
	const allowThrowAnything = Object.hasOwn(expectations, 'any') && expectations.any;
	if (!isNativeError(actual) && !allowThrowAnything) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [formatWithLabel(`${prefix} exception that is not an error:`, actual)],
		});
	}

	if (Object.hasOwn(expectations, 'is') && actual !== expectations.is) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected to be strictly equal to:', expectations.is),
			],
		});
	}

	if (expectations.instanceOf && !(actual instanceof expectations.instanceOf)) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected instance of:', expectations.instanceOf),
			],
		});
	}

	if (typeof expectations.name === 'string' && actual.name !== expectations.name) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected name to equal:', expectations.name),
			],
		});
	}

	if (typeof expectations.message === 'string' && actual.message !== expectations.message) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected message to equal:', expectations.message),
			],
		});
	}

	if (expectations.message instanceof RegExp && !expectations.message.test(actual.message)) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected message to match:', expectations.message),
			],
		});
	}

	if (typeof expectations.message === 'function' && expectations.message(actual.message) === false) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected message to return true:', expectations.message),
			],
		});
	}

	if (expectations.code !== undefined && actual.code !== expectations.code) {
		throw new AssertionError(message, {
			assertion,
			assertionStack,
			cause: actual,
			formattedDetails: [
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
		failPending = notImplemented,
		skip = notImplemented,
		compareWithSnapshot = notImplemented,
		experiments = {},
		disableSnapshots = false,
	} = {}) {
		const withSkip = assertionFn => {
			assertionFn.skip = skip;
			return assertionFn;
		};

		const assertMessage = (message, assertion) => {
			const result = checkAssertionMessage(message, assertion);
			if (result !== true) {
				throw fail(result);
			}
		};

		this.pass = withSkip(() => pass());

		this.fail = withSkip(message => {
			assertMessage(message, 't.fail()');

			throw fail(new AssertionError(message ?? 'Test failed via `t.fail()`', {
				assertion: 't.fail()',
			}));
		});

		this.is = withSkip((actual, expected, message) => {
			assertMessage(message, 't.is()');

			if (Object.is(actual, expected)) {
				return pass();
			}

			const result = concordance.compare(actual, expected, concordanceOptions);
			const actualDescriptor = result.actual ?? concordance.describe(actual, concordanceOptions);
			const expectedDescriptor = result.expected ?? concordance.describe(expected, concordanceOptions);

			if (result.pass) {
				throw fail(new AssertionError(message, {
					assertion: 't.is()',
					formattedDetails: [formatDescriptorWithLabel('Values are deeply equal to each other, but they are not the same:', actualDescriptor)],
				}));
			} else {
				throw fail(new AssertionError(message, {
					assertion: 't.is()',
					formattedDetails: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)],
				}));
			}
		});

		this.not = withSkip((actual, expected, message) => {
			assertMessage(message, 't.not()');

			if (Object.is(actual, expected)) {
				throw fail(new AssertionError(message, {
					assertion: 't.not()',
					formattedDetails: [formatWithLabel('Value is the same as:', actual)],
				}));
			}

			return pass();
		});

		this.deepEqual = withSkip((actual, expected, message) => {
			assertMessage(message, 't.deepEqual()');

			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				return pass();
			}

			const actualDescriptor = result.actual ?? concordance.describe(actual, concordanceOptions);
			const expectedDescriptor = result.expected ?? concordance.describe(expected, concordanceOptions);
			throw fail(new AssertionError(message, {
				assertion: 't.deepEqual()',
				formattedDetails: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)],
			}));
		});

		this.notDeepEqual = withSkip((actual, expected, message) => {
			assertMessage(message, 't.notDeepEqual()');

			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				const actualDescriptor = result.actual ?? concordance.describe(actual, concordanceOptions);
				throw fail(new AssertionError(message, {
					assertion: 't.notDeepEqual()',
					formattedDetails: [formatDescriptorWithLabel('Value is deeply equal:', actualDescriptor)],
				}));
			}

			return pass();
		});

		this.like = withSkip((actual, selector, message) => {
			assertMessage(message, 't.like()');

			if (!isLikeSelector(selector)) {
				throw fail(new AssertionError('`t.like()` selector must be a non-empty object', {
					assertion: 't.like()',
					formattedDetails: [formatWithLabel('Called with:', selector)],
				}));
			}

			let comparable;
			try {
				comparable = selectComparable(actual, selector);
			} catch (error) {
				if (error === CIRCULAR_SELECTOR) {
					throw fail(new AssertionError('`t.like()` selector must not contain circular references', {
						assertion: 't.like()',
						formattedDetails: [formatWithLabel('Called with:', selector)],
					}));
				}

				throw error;
			}

			const result = concordance.compare(comparable, selector, concordanceOptions);
			if (result.pass) {
				return pass();
			}

			const actualDescriptor = result.actual ?? concordance.describe(comparable, concordanceOptions);
			const expectedDescriptor = result.expected ?? concordance.describe(selector, concordanceOptions);
			throw fail(new AssertionError(message, {
				assertion: 't.like()',
				formattedDetails: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)],
			}));
		});

		this.throws = withSkip((...args) => {
			// Since arrow functions do not support 'arguments', we are using rest
			// operator, so we can determine the total number of arguments passed
			// to the function.
			let [fn, expectations, message] = args;

			assertMessage(message, 't.throws()');

			if (typeof fn !== 'function') {
				throw fail(new AssertionError('`t.throws()` must be called with a function', {
					assertion: 't.throws()',
					improperUsage: {assertion: 'throws'},
					formattedDetails: [formatWithLabel('Called with:', fn)],
				}));
			}

			try {
				expectations = validateExpectations('t.throws()', expectations, args.length, experiments);
			} catch (error) {
				throw fail(error);
			}

			let retval;
			let threw = false;
			let actual = null;
			try {
				retval = fn();
				if (isPromise(retval)) {
					// Here isPromise() checks if something is "promise like". Cast to an actual promise.
					Promise.resolve(retval).catch(noop); // eslint-disable-line promise/prefer-await-to-then
					throw fail(new AssertionError(message, {
						assertion: 't.throws()',
						formattedDetails: [formatWithLabel('Function returned a promise. Use `t.throwsAsync()` instead:', retval)],
					}));
				}
			} catch (error) {
				threw = true;
				actual = error;
			}

			if (!threw) {
				throw fail(new AssertionError(message, {
					assertion: 't.throws()',
					formattedDetails: [formatWithLabel('Function returned:', retval)],
				}));
			}

			try {
				assertExpectations({
					assertion: 't.throws()',
					actual,
					expectations,
					message,
					prefix: 'Function threw',
				});
				pass();
				return actual;
			} catch (error) {
				throw fail(error);
			}
		});

		this.throwsAsync = withSkip(async (...args) => {
			let [thrower, expectations, message] = args;

			try {
				assertMessage(message, 't.throwsAsync()');
			} catch (error) {
				try {
					await thrower;
				} catch {}

				throw error;
			}

			if (typeof thrower !== 'function' && !isPromise(thrower)) {
				throw fail(new AssertionError('`t.throwsAsync()` must be called with a function or promise', {
					assertion: 't.throwsAsync()',
					formattedDetails: [formatWithLabel('Called with:', thrower)],
				}));
			}

			try {
				expectations = validateExpectations('t.throwsAsync()', expectations, args.length, experiments);
			} catch (error) {
				try {
					await thrower;
				} catch {}

				throw fail(error);
			}

			const handlePromise = async (promise, wasReturned) => {
				// Record the stack before it gets lost in the promise chain.
				const assertionStack = getAssertionStack();
				// Handle "promise like" objects by casting to a real Promise.
				const intermediate = Promise.resolve(promise).then(value => { // eslint-disable-line promise/prefer-await-to-then
					throw failPending(new AssertionError(message, {
						assertion: 't.throwsAsync()',
						assertionStack,
						formattedDetails: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} resolved with:`, value)],
					}));
				}, error => {
					try {
						assertExpectations({
							assertion: 't.throwsAsync()',
							actual: error,
							expectations,
							message,
							prefix: `${wasReturned ? 'Returned promise' : 'Promise'} rejected with`,
							assertionStack,
						});
						return error;
					} catch (error_) {
						throw failPending(error_);
					}
				});

				pending(intermediate);
				return intermediate;
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
				throw fail(new AssertionError(message, {
					assertion: 't.throwsAsync()',
					cause: actual,
					formattedDetails: [formatWithLabel('Function threw synchronously. Use `t.throws()` instead:', actual)],
				}));
			}

			if (isPromise(retval)) {
				return handlePromise(retval, true);
			}

			throw fail(new AssertionError(message, {
				assertion: 't.throwsAsync()',
				formattedDetails: [formatWithLabel('Function returned:', retval)],
			}));
		});

		this.notThrows = withSkip((fn, message) => {
			assertMessage(message, 't.notThrows()');

			if (typeof fn !== 'function') {
				throw fail(new AssertionError('`t.notThrows()` must be called with a function', {
					assertion: 't.notThrows()',
					improperUsage: {assertion: 'notThrows'},
					formattedDetails: [formatWithLabel('Called with:', fn)],
				}));
			}

			try {
				fn();
			} catch (error) {
				throw fail(new AssertionError(message, {
					assertion: 't.notThrows()',
					cause: error,
					formattedDetails: [formatWithLabel('Function threw:', error)],
				}));
			}

			return pass();
		});

		this.notThrowsAsync = withSkip(async (nonThrower, message) => {
			try {
				assertMessage(message, 't.notThrowsAsync()');
			} catch (error) {
				try {
					await nonThrower;
				} catch {}

				throw error;
			}

			if (typeof nonThrower !== 'function' && !isPromise(nonThrower)) {
				throw fail(new AssertionError('`t.notThrowsAsync()` must be called with a function or promise', {
					assertion: 't.notThrowsAsync()',
					formattedDetails: [formatWithLabel('Called with:', nonThrower)],
				}));
			}

			const handlePromise = async (promise, wasReturned) => {
				// Create an error object to record the stack before it gets lost in the promise chain.
				const assertionStack = getAssertionStack();
				// Handle "promise like" objects by casting to a real Promise.
				const intermediate = Promise.resolve(promise).then(noop, error => { // eslint-disable-line promise/prefer-await-to-then
					throw failPending(new AssertionError(message, {
						assertion: 't.notThrowsAsync()',
						assertionStack,
						formattedDetails: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} rejected with:`, error)],
					}));
				});
				pending(intermediate);

				await intermediate;
				return true;
			};

			if (isPromise(nonThrower)) {
				return handlePromise(nonThrower, false);
			}

			let retval;
			try {
				retval = nonThrower();
			} catch (error) {
				throw fail(new AssertionError(message, {
					assertion: 't.notThrowsAsync()',
					cause: error,
					formattedDetails: [formatWithLabel('Function threw:', error)],
				}));
			}

			if (!isPromise(retval)) {
				throw fail(new AssertionError(message, {
					assertion: 't.notThrowsAsync()',
					formattedDetails: [formatWithLabel('Function did not return a promise. Use `t.notThrows()` instead:', retval)],
				}));
			}

			return handlePromise(retval, true);
		});

		this.snapshot = withSkip((expected, message) => {
			if (disableSnapshots) {
				throw fail(new AssertionError('`t.snapshot()` can only be used in tests', {
					assertion: 't.snapshot()',
				}));
			}

			assertMessage(message, 't.snapshot()');

			if (message === '') {
				throw fail(new AssertionError('The snapshot assertion message must be a non-empty string', {
					assertion: 't.snapshot()',
					formattedDetails: [formatWithLabel('Called with:', message)],
				}));
			}

			let result;
			try {
				result = compareWithSnapshot({expected, message});
			} catch (error) {
				if (!(error instanceof SnapshotError)) {
					throw error;
				}

				const improperUsage = {assertion: 'snapshot', name: error.name, snapPath: error.snapPath};
				if (error instanceof VersionMismatchError) {
					improperUsage.snapVersion = error.snapVersion;
					improperUsage.expectedVersion = error.expectedVersion;
				}

				throw fail(new AssertionError(message ?? 'Could not compare snapshot', {
					asssertion: 't.snapshot()',
					improperUsage,
				}));
			}

			if (result.pass) {
				return pass();
			}

			if (result.actual) {
				throw fail(new AssertionError(message ?? 'Did not match snapshot', {
					assertion: 't.snapshot()',
					formattedDetails: [formatDescriptorDiff(result.actual, result.expected, {invert: true})],
				}));
			} else {
				// This can only occur in CI environments.
				throw fail(new AssertionError(message ?? 'No snapshot available — new snapshots are not created in CI environments', {
					assertion: 't.snapshot()',
				}));
			}
		});

		this.truthy = withSkip((actual, message) => {
			assertMessage(message, 't.truthy()');

			if (actual) {
				return pass();
			}

			throw fail(new AssertionError(message, {
				assertion: 't.truthy()',
				formattedDetails: [formatWithLabel('Value is not truthy:', actual)],
			}));
		});

		this.falsy = withSkip((actual, message) => {
			assertMessage(message, 't.falsy()');

			if (actual) {
				throw fail(new AssertionError(message, {
					assertion: 't.falsy()',
					formattedDetails: [formatWithLabel('Value is not falsy:', actual)],
				}));
			}

			return pass();
		});

		this.true = withSkip((actual, message) => {
			assertMessage(message, 't.true()');

			if (actual === true) {
				return pass();
			}

			throw fail(new AssertionError(message, {
				assertion: 't.true()',
				formattedDetails: [formatWithLabel('Value is not `true`:', actual)],
			}));
		});

		this.false = withSkip((actual, message) => {
			assertMessage(message, 't.false()');

			if (actual === false) {
				return pass();
			}

			throw fail(new AssertionError(message, {
				assertion: 't.false()',
				formattedDetails: [formatWithLabel('Value is not `false`:', actual)],
			}));
		});

		this.regex = withSkip((string, regex, message) => {
			assertMessage(message, 't.regex()');

			if (typeof string !== 'string') {
				throw fail(new AssertionError('`t.regex()` must be called with a string', {
					assertion: 't.regex()',
					formattedDetails: [formatWithLabel('Called with:', string)],
				}));
			}

			if (!(regex instanceof RegExp)) {
				throw fail(new AssertionError('`t.regex()` must be called with a regular expression', {
					assertion: 't.regex()',
					formattedDetails: [formatWithLabel('Called with:', regex)],
				}));
			}

			if (!regex.test(string)) {
				throw fail(new AssertionError(message, {
					assertion: 't.regex()',
					formattedDetails: [
						formatWithLabel('Value must match expression:', string),
						formatWithLabel('Regular expression:', regex),
					],
				}));
			}

			return pass();
		});

		this.notRegex = withSkip((string, regex, message) => {
			assertMessage(message, 't.notRegex()');

			if (typeof string !== 'string') {
				throw fail(new AssertionError('`t.notRegex()` must be called with a string', {
					assertion: 't.notRegex()',
					formattedDetails: [formatWithLabel('Called with:', string)],
				}));
			}

			if (!(regex instanceof RegExp)) {
				throw fail(new AssertionError('`t.notRegex()` must be called with a regular expression', {
					assertion: 't.notRegex()',
					formattedDetails: [formatWithLabel('Called with:', regex)],
				}));
			}

			if (regex.test(string)) {
				throw fail(new AssertionError(message, {
					assertion: 't.notRegex()',
					formattedDetails: [
						formatWithLabel('Value must not match expression:', string),
						formatWithLabel('Regular expression:', regex),
					],
				}));
			}

			return pass();
		});

		this.assert = withSkip((actual, message) => {
			assertMessage(message, 't.assert()');

			if (!actual) {
				throw fail(new AssertionError(message, {
					assertion: 't.assert()',
					formattedDetails: [formatWithLabel('Value is not truthy:', actual)],
				}));
			}

			return pass();
		});
	}
}
