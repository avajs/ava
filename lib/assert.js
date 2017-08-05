'use strict';
const concordance = require('concordance');
const coreAssert = require('core-assert');
const observableToPromise = require('observable-to-promise');
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
	const log = callbacks.log;

	const noop = () => {};
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
			if (Object.is(actual, expected)) {
				pass(this);
			} else {
				const actualDescriptor = concordance.describe(actual, concordanceOptions);
				const expectedDescriptor = concordance.describe(expected, concordanceOptions);
				fail(this, new AssertionError({
					assertion: 'is',
					message,
					raw: {actual, expected},
					values: [formatDescriptorDiff(actualDescriptor, expectedDescriptor)]
				}));
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

		log(text) {
			log(this, text);
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
					values: [formatWithLabel('Called with:', fn)]
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
					throw new AssertionError({
						assertion: 'throws',
						message,
						stack,
						values: threw ?
							[formatWithLabel('Threw unexpected exception:', actual)] :
							null
					});
				}
			};

			if (promise) {
				// Record stack before it gets lost in the promise chain.
				const stack = getStack();
				const intermediate = promise.then(value => {
					throw new AssertionError({
						assertion: 'throws',
						message: 'Expected promise to be rejected, but it was resolved instead',
						values: [formatWithLabel('Resolved with:', value)]
					});
				}, reason => test(makeRethrow(reason), stack));

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
					values: [formatWithLabel('Called with:', fn)]
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
						values: [formatWithLabel('Threw:', err.actual)]
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
					values: [formatWithLabel('Error:', actual)]
				}));
			} else {
				pass(this);
			}
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
				result = this._test.compareWithSnapshot(options);
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
