'use strict';
const concordance = require('concordance');
const isError = require('is-error');
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
		this.actualStack = opts.actualStack;
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

function validateExpectations(assertion, expectations, numArgs) { // eslint-disable-line complexity
	if (typeof expectations === 'function') {
		expectations = {instanceOf: expectations};
	} else if (typeof expectations === 'string' || expectations instanceof RegExp) {
		expectations = {message: expectations};
	} else if (numArgs === 1 || expectations === null) {
		expectations = {};
	} else if (typeof expectations !== 'object' || Array.isArray(expectations) || Object.keys(expectations).length === 0) {
		throw new AssertionError({
			assertion,
			message: `The second argument to \`t.${assertion}()\` must be a function, string, regular expression, expectation object or \`null\``,
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
function assertExpectations({assertion, actual, expectations, message, prefix, stack}) {
	if (!isError(actual)) {
		throw new AssertionError({
			assertion,
			message,
			stack,
			values: [formatWithLabel(`${prefix} exception that is not an error:`, actual)]
		});
	}

	const actualStack = actual.stack;

	if (hasOwnProperty(expectations, 'is') && actual !== expectations.is) {
		throw new AssertionError({
			assertion,
			message,
			stack,
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
			stack,
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
			stack,
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
			stack,
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
			stack,
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
			stack,
			actualStack,
			values: [
				formatWithLabel(`${prefix} unexpected exception:`, actual),
				formatWithLabel('Expected code to equal:', expectations.code)
			]
		});
	}
}

function wrapAssertions(callbacks) {
	const {pass, pending, fail} = callbacks;
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

		throws(fn, expectations, message) {
			if (typeof fn !== 'function') {
				fail(this, new AssertionError({
					assertion: 'throws',
					improperUsage: true,
					message: '`t.throws()` must be called with a function',
					values: [formatWithLabel('Called with:', fn)]
				}));
				return;
			}

			try {
				expectations = validateExpectations('throws', expectations, arguments.length);
			} catch (error) {
				fail(this, error);
				return;
			}

			let retval;
			let actual;
			let threw = false;
			try {
				retval = fn();
				if (isPromise(retval)) {
					try {
						retval.catch(noop);
					} catch (_) {}

					fail(this, new AssertionError({
						assertion: 'throws',
						message,
						values: [formatWithLabel('Function returned a promise. Use `t.throwsAsync()` instead:', retval)]
					}));
					return;
				}
			} catch (error) {
				actual = error;
				threw = true;
			}

			if (!threw) {
				fail(this, new AssertionError({
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
				pass(this);
				return actual;
			} catch (error) {
				fail(this, error);
			}
		},

		throwsAsync(thrower, expectations, message) {
			if (typeof thrower !== 'function' && !isPromise(thrower)) {
				fail(this, new AssertionError({
					assertion: 'throwsAsync',
					improperUsage: true,
					message: '`t.throwsAsync()` must be called with a function or promise',
					values: [formatWithLabel('Called with:', thrower)]
				}));
				return Promise.resolve();
			}

			try {
				expectations = validateExpectations('throwsAsync', expectations, arguments.length);
			} catch (error) {
				fail(this, error);
				return Promise.resolve();
			}

			const handlePromise = (promise, wasReturned) => {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = promise.then(value => {
					throw new AssertionError({
						assertion: 'throwsAsync',
						message,
						stack,
						values: [formatWithLabel(`${wasReturned ? 'Returned promise' : 'Promise'} resolved with:`, value)]
					});
				}, reason => {
					assertExpectations({
						assertion: 'throwsAsync',
						actual: reason,
						expectations,
						message,
						prefix: `${wasReturned ? 'Returned promise' : 'Promise'} rejected with`,
						stack
					});
					return reason;
				});

				pending(this, intermediate);
				// Don't reject the returned promise, even if the assertion fails.
				return intermediate.catch(noop);
			};

			if (isPromise(thrower)) {
				return handlePromise(thrower, false);
			}

			let retval;
			let actual;
			let threw = false;
			try {
				retval = thrower();
			} catch (error) {
				actual = error;
				threw = true;
			}

			if (threw) {
				fail(this, new AssertionError({
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

			fail(this, new AssertionError({
				assertion: 'throwsAsync',
				message,
				values: [formatWithLabel('Function returned:', retval)]
			}));
			return Promise.resolve();
		},

		notThrows(fn, message) {
			if (typeof fn !== 'function') {
				fail(this, new AssertionError({
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
				fail(this, new AssertionError({
					assertion: 'notThrows',
					message,
					actualStack: error.stack,
					values: [formatWithLabel('Function threw:', error)]
				}));
				return;
			}

			pass(this);
		},

		notThrowsAsync(nonThrower, message) {
			if (typeof nonThrower !== 'function' && !isPromise(nonThrower)) {
				fail(this, new AssertionError({
					assertion: 'notThrowsAsync',
					improperUsage: true,
					message: '`t.notThrowsAsync()` must be called with a function or promise',
					values: [formatWithLabel('Called with:', nonThrower)]
				}));
				return Promise.resolve();
			}

			const handlePromise = (promise, wasReturned) => {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = promise.then(noop, reason => {
					throw new AssertionError({
						assertion: 'notThrowsAsync',
						message,
						actualStack: stack,
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

			let retval;
			try {
				retval = nonThrower();
			} catch (error) {
				fail(this, new AssertionError({
					assertion: 'notThrowsAsync',
					message,
					actualStack: error.stack,
					values: [formatWithLabel('Function threw:', error)]
				}));
				return Promise.resolve();
			}

			if (!isPromise(retval)) {
				fail(this, new AssertionError({
					assertion: 'notThrowsAsync',
					message,
					values: [formatWithLabel('Function did not return a promise. Use `t.notThrows()` instead:', retval)]
				}));
				return Promise.resolve();
			}

			return handlePromise(retval, true);
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
			} catch (error) {
				if (!(error instanceof snapshotManager.SnapshotError)) {
					throw error;
				}

				const improperUsage = {name: error.name, snapPath: error.snapPath};
				if (error instanceof snapshotManager.VersionMismatchError) {
					improperUsage.snapVersion = error.snapVersion;
					improperUsage.expectedVersion = error.expectedVersion;
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
		},

		truthy(actual, message) {
			if (actual) {
				pass(this);
			} else {
				fail(this, new AssertionError({
					assertion: 'truthy',
					message,
					operator: '!!',
					values: [formatWithLabel('Value is not truthy:', actual)]
				}));
			}
		},

		falsy(actual, message) {
			if (actual) {
				fail(this, new AssertionError({
					assertion: 'falsy',
					message,
					operator: '!',
					values: [formatWithLabel('Value is not falsy:', actual)]
				}));
			} else {
				pass(this);
			}
		},

		true(actual, message) {
			if (actual === true) {
				pass(this);
			} else {
				fail(this, new AssertionError({
					assertion: 'true',
					message,
					values: [formatWithLabel('Value is not `true`:', actual)]
				}));
			}
		},

		false(actual, message) {
			if (actual === false) {
				pass(this);
			} else {
				fail(this, new AssertionError({
					assertion: 'false',
					message,
					values: [formatWithLabel('Value is not `false`:', actual)]
				}));
			}
		},

		regex(string, regex, message) {
			if (typeof string !== 'string') {
				fail(this, new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a string',
					values: [formatWithLabel('Called with:', string)]
				}));
				return;
			}

			if (!(regex instanceof RegExp)) {
				fail(this, new AssertionError({
					assertion: 'regex',
					improperUsage: true,
					message: '`t.regex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)]
				}));
				return;
			}

			if (!regex.test(string)) {
				fail(this, new AssertionError({
					assertion: 'regex',
					message,
					values: [
						formatWithLabel('Value must match expression:', string),
						formatWithLabel('Regular expression:', regex)
					]
				}));
				return;
			}

			pass(this);
		},

		notRegex(string, regex, message) {
			if (typeof string !== 'string') {
				fail(this, new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a string',
					values: [formatWithLabel('Called with:', string)]
				}));
				return;
			}

			if (!(regex instanceof RegExp)) {
				fail(this, new AssertionError({
					assertion: 'notRegex',
					improperUsage: true,
					message: '`t.notRegex()` must be called with a regular expression',
					values: [formatWithLabel('Called with:', regex)]
				}));
				return;
			}

			if (regex.test(string)) {
				fail(this, new AssertionError({
					assertion: 'notRegex',
					message,
					values: [
						formatWithLabel('Value must not match expression:', string),
						formatWithLabel('Regular expression:', regex)
					]
				}));
				return;
			}

			pass(this);
		}
	};

	const enhancedAssertions = enhanceAssert(pass, fail, {
		assert(actual, message) {
			if (!actual) {
				throw new AssertionError({
					assertion: 'assert',
					message,
					operator: '!!',
					values: [formatWithLabel('Value is not truthy:', actual)]
				});
			}
		}
	});

	return Object.assign(assertions, enhancedAssertions);
}

exports.wrapAssertions = wrapAssertions;
