'use strict';
const concordance = require('concordance');
const observableToPromise = require('observable-to-promise');
const isError = require('is-error');
const isObservable = require('is-observable');
const isPromise = require('is-promise');
const concordanceOptions = require('./concordance-options').default;
const concordanceDiffOptions = require('./concordance-options').diff;
const enhanceAssert = require('./enhance-assert');
const snapshotManager = require('./snapshot-manager');

function formatDescriptorDiff(actualDescriptor, expectedDescriptor, options) {
	options = Object.assign({}, options, concordanceDiffOptions);
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

const hasOwnProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

class AssertionError extends Error {
	constructor(opts) {
		super(opts.message || '');
		this.name = 'AssertionError';

		this.assertion = opts.assertion;
		this.fixedSource = opts.fixedSource;
		this.improperUsage = opts.improperUsage || false;
		this.operator = opts.operator;
		this.values = opts.values || [];

		// Raw expected and actual objects are stored for custom reporters
		// (such as wallaby.js), that manage worker processes directly and
		// use the values for custom diff views
		this.raw = opts.raw;

		// Reserved for power-assert statements
		this.statements = [];

		if (opts.stack) {
			this.stack = opts.stack;
		} else {
			const limitBefore = Error.stackTraceLimit;
			Error.stackTraceLimit = Infinity;
			Error.captureStackTrace(this);
			Error.stackTraceLimit = limitBefore;
		}
	}
}
exports.AssertionError = AssertionError;

function getStack() {
	const limitBefore = Error.stackTraceLimit;
	Error.stackTraceLimit = Infinity;
	const obj = {};
	Error.captureStackTrace(obj, getStack);
	Error.stackTraceLimit = limitBefore;
	return obj.stack;
}

function wrapAssertions(callbacks) {
	const pass = callbacks.pass;
	const pending = callbacks.pending;
	const fail = callbacks.fail;

	const noop = () => {};

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
			if (Object.is(actual, expected)) {
				pass(this);
			} else {
				const result = concordance.compare(actual, expected, concordanceOptions);
				const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
				const expectedDescriptor = result.expected || concordance.describe(expected, concordanceOptions);

				if (result.pass) {
					fail(this, new AssertionError({
						assertion: 'is',
						message,
						raw: {actual, expected},
						values: [formatDescriptorWithLabel('Values are deeply equal to each other, but they are not the same:', actualDescriptor)]
					}));
				} else {
					fail(this, new AssertionError({
						assertion: 'is',
						message,
						raw: {actual, expected},
						values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)]
					}));
				}
			}
		},

		not(actual, expected, message) {
			if (Object.is(actual, expected)) {
				fail(this, new AssertionError({
					assertion: 'not',
					message,
					raw: {actual, expected},
					values: [formatWithLabel('Value is the same as:', actual)]
				}));
			} else {
				pass(this);
			}
		},

		deepEqual(actual, expected, message) {
			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				pass(this);
			} else {
				const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
				const expectedDescriptor = result.expected || concordance.describe(expected, concordanceOptions);
				fail(this, new AssertionError({
					assertion: 'deepEqual',
					message,
					raw: {actual, expected},
					values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)]
				}));
			}
		},

		notDeepEqual(actual, expected, message) {
			const result = concordance.compare(actual, expected, concordanceOptions);
			if (result.pass) {
				const actualDescriptor = result.actual || concordance.describe(actual, concordanceOptions);
				fail(this, new AssertionError({
					assertion: 'notDeepEqual',
					message,
					raw: {actual, expected},
					values: [formatDescriptorWithLabel('Value is deeply equal:', actualDescriptor)]
				}));
			} else {
				pass(this);
			}
		},

		throws(thrower, expected, message) { // eslint-disable-line complexity
			if (typeof thrower !== 'function' && !isPromise(thrower) && !isObservable(thrower)) {
				fail(this, new AssertionError({
					assertion: 'throws',
					improperUsage: true,
					message: '`t.throws()` must be called with a function, observable or promise',
					values: [formatWithLabel('Called with:', thrower)]
				}));
				return;
			}

			if (typeof expected === 'function') {
				expected = {instanceOf: expected};
			} else if (typeof expected === 'string' || expected instanceof RegExp) {
				expected = {message: expected};
			} else if (arguments.length === 1 || expected === null) {
				expected = {};
			} else if (typeof expected !== 'object' || Array.isArray(expected) || Object.keys(expected).length === 0) {
				fail(this, new AssertionError({
					assertion: 'throws',
					message: 'The second argument to `t.throws()` must be a function, string, regular expression, expectation object or `null`',
					values: [formatWithLabel('Called with:', expected)]
				}));
				return;
			} else {
				if (hasOwnProperty(expected, 'instanceOf') && typeof expected.instanceOf !== 'function') {
					fail(this, new AssertionError({
						assertion: 'throws',
						message: 'The `instanceOf` property of the second argument to `t.throws()` must be a function',
						values: [formatWithLabel('Called with:', expected)]
					}));
					return;
				}

				if (hasOwnProperty(expected, 'message') && typeof expected.message !== 'string' && !(expected.message instanceof RegExp)) {
					fail(this, new AssertionError({
						assertion: 'throws',
						message: 'The `message` property of the second argument to `t.throws()` must be a string or regular expression',
						values: [formatWithLabel('Called with:', expected)]
					}));
					return;
				}

				if (hasOwnProperty(expected, 'name') && typeof expected.name !== 'string') {
					fail(this, new AssertionError({
						assertion: 'throws',
						message: 'The `name` property of the second argument to `t.throws()` must be a string',
						values: [formatWithLabel('Called with:', expected)]
					}));
					return;
				}

				for (const key of Object.keys(expected)) {
					switch (key) {
						case 'instanceOf':
						case 'is':
						case 'message':
						case 'name':
							continue;
						default:
							fail(this, new AssertionError({
								assertion: 'throws',
								message: 'The second argument to `t.throws()` contains unexpected properties',
								values: [formatWithLabel('Called with:', expected)]
							}));
							return;
					}
				}
			}

			// Note: this function *must* throw exceptions, since it can be used
			// as part of a pending assertion for observables and promises.
			const assertExpected = (actual, prefix, stack) => {
				if (!isError(actual)) {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [formatWithLabel(`${prefix} exception that is not an error:`, actual)]
					});
				}

				if (hasOwnProperty(expected, 'is') && actual !== expected.is) {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [
							formatWithLabel(`${prefix} unexpected exception:`, actual),
							formatWithLabel('Expected to be strictly equal to:', expected.is)
						]
					});
				}

				if (expected.instanceOf && !(actual instanceof expected.instanceOf)) {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [
							formatWithLabel(`${prefix} unexpected exception:`, actual),
							formatWithLabel('Expected instance of:', expected.instanceOf)
						]
					});
				}

				if (typeof expected.name === 'string' && actual.name !== expected.name) {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [
							formatWithLabel(`${prefix} unexpected exception:`, actual),
							formatWithLabel('Expected name to equal:', expected.name)
						]
					});
				}

				if (typeof expected.message === 'string' && actual.message !== expected.message) {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [
							formatWithLabel(`${prefix} unexpected exception:`, actual),
							formatWithLabel('Expected message to equal:', expected.message)
						]
					});
				}

				if (expected.message instanceof RegExp && !expected.message.test(actual.message)) {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [
							formatWithLabel(`${prefix} unexpected exception:`, actual),
							formatWithLabel('Expected message to match:', expected.message)
						]
					});
				}
			};

			const handleObservable = (observable, wasReturned) => {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = observableToPromise(observable).then(value => {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [formatWithLabel(`${wasReturned ? 'Returned observable' : 'Observable'} completed with:`, value)]
					});
				}, reason => {
					assertExpected(reason, `${wasReturned ? 'Returned observable' : 'Observable'} errored with`, stack);
					return reason;
				});

				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			};

			const handlePromise = (promise, wasReturned) => {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = promise.then(value => {
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} resolved with:`, value)]
					});
				}, reason => {
					assertExpected(reason, `${wasReturned ? 'Returned promise' : 'Promise'} rejected with`, stack);
					return reason;
				});

				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			};

			if (isPromise(thrower)) {
				return handlePromise(thrower, false);
			}

			if (isObservable(thrower)) {
				return handleObservable(thrower, false);
			}

			let retval;
			let actual;
			let threw = false;
			try {
				retval = thrower();
			} catch (err) {
				actual = err;
				threw = true;
			}

			if (!threw) {
				if (isPromise(retval)) {
					return handlePromise(retval, true);
				}

				if (isObservable(retval)) {
					return handleObservable(retval, true);
				}

				fail(this, new AssertionError({
					assertion: 'throws',
					message,
					values: [formatWithLabel('Function returned:', retval)]
				}));

				return;
			}

			try {
				assertExpected(actual, 'Function threw');
				pass(this);
				return actual;
			} catch (err) {
				fail(this, err);
			}
		},

		notThrows(nonThrower, message) {
			if (typeof nonThrower !== 'function' && !isPromise(nonThrower) && !isObservable(nonThrower)) {
				fail(this, new AssertionError({
					assertion: 'notThrows',
					improperUsage: true,
					message: '`t.notThrows()` must be called with a function, observable or promise',
					values: [formatWithLabel('Called with:', nonThrower)]
				}));
				return;
			}

			const handleObservable = (observable, wasReturned) => {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = observableToPromise(observable).then(noop, reason => {
					throw new AssertionError({
						assertion: 'notThrows',
						message,
						stack,
						values: [formatWithLabel(`${wasReturned ? 'Returned observable' : 'Observable'} errored with:`, reason)]
					});
				});
				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			};

			const handlePromise = (promise, wasReturned) => {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = promise.then(noop, reason => {
					throw new AssertionError({
						assertion: 'notThrows',
						message,
						stack,
						values: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} rejected with:`, reason)]
					});
				});
				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			};

			if (isPromise(nonThrower)) {
				return handlePromise(nonThrower, false);
			}

			if (isObservable(nonThrower)) {
				return handleObservable(nonThrower, false);
			}

			let retval;
			try {
				retval = nonThrower();
			} catch (err) {
				fail(this, new AssertionError({
					assertion: 'notThrows',
					message,
					values: [formatWithLabel(`Function threw:`, err)]
				}));
				return;
			}

			if (isPromise(retval)) {
				return handlePromise(retval, true);
			}

			if (isObservable(retval)) {
				return handleObservable(retval, true);
			}

			pass(this);
		},

		snapshot(expected, optionsOrMessage, message) {
			const options = {};
			if (typeof optionsOrMessage === 'string') {
				message = optionsOrMessage;
			} else if (optionsOrMessage) {
				options.id = optionsOrMessage.id;
			}
			options.expected = expected;
			options.message = message;

			let result;
			try {
				result = this.compareWithSnapshot(options);
			} catch (err) {
				if (!(err instanceof snapshotManager.SnapshotError)) {
					throw err;
				}

				const improperUsage = {name: err.name, snapPath: err.snapPath};
				if (err instanceof snapshotManager.VersionMismatchError) {
					improperUsage.snapVersion = err.snapVersion;
					improperUsage.expectedVersion = err.expectedVersion;
				}

				fail(this, new AssertionError({
					assertion: 'snapshot',
					message: message || 'Could not compare snapshot',
					improperUsage
				}));
				return;
			}

			if (result.pass) {
				pass(this);
			} else if (result.actual) {
				fail(this, new AssertionError({
					assertion: 'snapshot',
					message: message || 'Did not match snapshot',
					values: [formatDescriptorDiff(result.actual, result.expected, {invert: true})]
				}));
			} else {
				fail(this, new AssertionError({
					assertion: 'snapshot',
					message: message || 'No snapshot available, run with --update-snapshots'
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
					values: [formatWithLabel('Value is not truthy:', actual)]
				});
			}
		},

		falsy(actual, message) {
			if (actual) {
				throw new AssertionError({
					assertion: 'falsy',
					message,
					operator: '!',
					values: [formatWithLabel('Value is not falsy:', actual)]
				});
			}
		},

		true(actual, message) {
			if (actual !== true) {
				throw new AssertionError({
					assertion: 'true',
					message,
					values: [formatWithLabel('Value is not `true`:', actual)]
				});
			}
		},

		false(actual, message) {
			if (actual !== false) {
				throw new AssertionError({
					assertion: 'false',
					message,
					values: [formatWithLabel('Value is not `false`:', actual)]
				});
			}
		},

		regex(string, regex, message) {
			if (typeof string !== 'string') {
				throw new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a string',
					values: [formatWithLabel('Called with:', string)]
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)]
				});
			}

			if (!regex.test(string)) {
				throw new AssertionError({
					assertion: 'regex',
					message,
					values: [
						formatWithLabel('Value must match expression:', string),
						formatWithLabel('Regular expression:', regex)
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
					values: [formatWithLabel('Called with:', string)]
				});
			}
			if (!(regex instanceof RegExp)) {
				throw new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)]
				});
			}

			if (regex.test(string)) {
				throw new AssertionError({
					assertion: 'notRegex',
					message,
					values: [
						formatWithLabel('Value must not match expression:', string),
						formatWithLabel('Regular expression:', regex)
					]
				});
			}
		}
	});

	return Object.assign(assertions, enhancedAssertions);
}
exports.wrapAssertions = wrapAssertions;
