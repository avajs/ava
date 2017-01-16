'use strict';
const assert = require('core-assert');
const deepEqual = require('lodash.isequal');
const observableToPromise = require('observable-to-promise');
const indentString = require('indent-string');
const isObservable = require('is-observable');
const isPromise = require('is-promise');
const jestSnapshot = require('jest-snapshot');
const reactElementToJSXString = require('react-element-to-jsx-string').default;
const snapshotState = require('./snapshot-state');

const x = module.exports;
const noop = () => {};

Object.defineProperty(x, 'AssertionError', {value: assert.AssertionError});

function create(val, expected, operator, msg, fn) {
	return {
		actual: val,
		expected,
		message: msg || ' ',
		operator,
		stackStartFunction: fn
	};
}

function test(ok, opts) {
	if (!ok) {
		const err = new assert.AssertionError(opts);
		err.showOutput = ['fail'].indexOf(err.operator) === -1;
		throw err;
	}
}

x.pass = msg => {
	test(true, create(true, true, 'pass', msg, x.pass));
};

x.fail = msg => {
	msg = msg || 'Test failed via t.fail()';
	test(false, create(false, false, 'fail', msg, x.fail));
};

x.truthy = (val, msg) => {
	test(val, create(val, true, '==', msg, x.truthy));
};

x.falsy = (val, msg) => {
	test(!val, create(val, false, '==', msg, x.falsy));
};

x.true = (val, msg) => {
	test(val === true, create(val, true, '===', msg, x.true));
};

x.false = (val, msg) => {
	test(val === false, create(val, false, '===', msg, x.false));
};

x.is = (val, expected, msg) => {
	test(val === expected, create(val, expected, '===', msg, x.is));
};

x.not = (val, expected, msg) => {
	test(val !== expected, create(val, expected, '!==', msg, x.not));
};

x.deepEqual = (val, expected, msg) => {
	test(deepEqual(val, expected), create(val, expected, '===', msg, x.deepEqual));
};

x.notDeepEqual = (val, expected, msg) => {
	test(!deepEqual(val, expected), create(val, expected, '!==', msg, x.notDeepEqual));
};

x.throws = (fn, err, msg) => {
	if (isObservable(fn)) {
		fn = observableToPromise(fn);
	}

	if (isPromise(fn)) {
		return fn
			.then(() => {
				x.throws(noop, err, msg);
			}, fnErr => {
				return x.throws(() => {
					throw fnErr;
				}, err, msg);
			});
	}

	if (typeof fn !== 'function') {
		throw new TypeError('t.throws must be called with a function, Promise, or Observable');
	}

	try {
		if (typeof err === 'string') {
			const errMsg = err;
			err = err => err.message === errMsg;
		}

		let result;

		assert.throws(() => {
			try {
				fn();
			} catch (err) {
				result = err;
				throw err;
			}
		}, err, msg);

		return result;
	} catch (err) {
		test(false, create(err.actual, err.expected, err.operator, err.message, x.throws));
	}
};

x.notThrows = (fn, msg) => {
	if (isObservable(fn)) {
		fn = observableToPromise(fn);
	}

	if (isPromise(fn)) {
		return fn
			.catch(err => {
				x.notThrows(() => {
					throw err;
				}, msg);
			});
	}

	if (typeof fn !== 'function') {
		throw new TypeError('t.notThrows must be called with a function, Promise, or Observable');
	}

	try {
		assert.doesNotThrow(fn, msg);
	} catch (err) {
		test(false, create(err.actual, err.expected, err.operator, err.message, x.notThrows));
	}
};

x.regex = (contents, regex, msg) => {
	test(regex.test(contents), create(regex, contents, '===', msg, x.regex));
};

x.notRegex = (contents, regex, msg) => {
	test(!regex.test(contents), create(regex, contents, '!==', msg, x.notRegex));
};

x.ifError = (err, msg) => {
	test(!err, create(err, 'Error', '!==', msg, x.ifError));
};

x.jsxEqual = (val, expected, msg) => {
	const treeEquals = reactElementToJSXString(val) === reactElementToJSXString(expected);
	test(treeEquals, create(val, expected, '===', msg, x.jsxEqual));
};

x.notJsxEqual = (val, expected, msg) => {
	const treeEquals = reactElementToJSXString(val) === reactElementToJSXString(expected);
	test(!treeEquals, create(val, expected, '!==', msg, x.jsxNotEqual));
};

x._snapshot = function (tree, optionalMessage, match, snapshotStateGetter) {
	// Set defaults - this allows tests to mock deps easily
	const toMatchSnapshot = match || jestSnapshot.toMatchSnapshot;
	const getState = snapshotStateGetter || snapshotState.get;

	const state = getState();

	const context = {
		dontThrow() {},
		currentTestName: this.title,
		snapshotState: state
	};

	const result = toMatchSnapshot.call(context, tree);

	let message = 'Please check your code or --update-snapshots\n\n';

	if (optionalMessage) {
		message += indentString(optionalMessage, 2);
	}

	if (typeof result.message === 'function') {
		message += indentString(result.message(), 2);
	}

	state.save();

	test(result.pass, create(result, false, 'snapshot', message, x.snap));
};

x.snapshot = function (tree, optionalMessage) {
	x._snapshot.call(this, tree, optionalMessage);
};
