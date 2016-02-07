'use strict';
var assert = require('core-assert');
var deepEqual = require('deeper');
var observableToPromise = require('observable-to-promise');
var isObservable = require('is-observable');
var isPromise = require('is-promise');
var util = require('util');
var x = module.exports;

Object.defineProperty(x, 'AssertionError', {value: assert.AssertionError});

function noop() {}

function create(val, expected, operator, msg, fn) {
	return {
		actual: val,
		expected: expected,
		message: msg,
		operator: operator,
		stackStartFunction: fn
	};
}

function test(ok, opts) {
	if (!ok) {
		throw new assert.AssertionError(opts);
	}
}

x.pass = function (msg) {
	test(true, create(true, true, 'pass', msg, x.pass));
};

x.fail = function (msg) {
	msg = msg || 'Test failed via t.fail()';
	test(false, create(false, false, 'fail', msg, x.fail));
};

x.ok = function (val, msg) {
	test(val, create(val, true, '==', msg, x.ok));
};

x.notOk = function (val, msg) {
	test(!val, create(val, false, '==', msg, x.notOk));
};

x.true = function (val, msg) {
	test(val === true, create(val, true, '===', msg, x.true));
};

x.false = function (val, msg) {
	test(val === false, create(val, false, '===', msg, x.false));
};

x.is = function (val, expected, msg) {
	test(val === expected, create(val, expected, '===', msg, x.is));
};

x.not = function (val, expected, msg) {
	test(val !== expected, create(val, expected, '!==', msg, x.not));
};

x.same = function (val, expected, msg) {
	test(deepEqual(val, expected), create(val, expected, '===', msg, x.same));
};

x.notSame = function (val, expected, msg) {
	test(!deepEqual(val, expected), create(val, expected, '!==', msg, x.notSame));
};

x.throws = function (fn, err, msg) {
	if (isObservable(fn)) {
		fn = observableToPromise(fn);
	}

	if (isPromise(fn)) {
		return fn
			.then(function () {
				x.throws(noop, err, msg);
			}, function (fnErr) {
				x.throws(function () {
					if (fnErr instanceof Error) {
						throw fnErr;
					} else {
						throw new Error(fnErr);
					}
				}, err, msg);
			});
	}

	try {
		if (typeof err === 'string') {
			var errMsg = err;
			err = function (err) {
				return err.message === errMsg;
			};
		}

		assert.throws(fn, err, msg);
	} catch (err) {
		test(false, create(err.actual, err.expected, err.operator, err.message, x.throws));
	}
};

x.notThrows = function (fn, msg) {
	if (isObservable(fn)) {
		fn = observableToPromise(fn);
	}

	if (isPromise(fn)) {
		return fn
			.catch(function (err) {
				x.notThrows(function () {
					throw err;
				}, msg);
			});
	}

	try {
		assert.doesNotThrow(fn, msg);
	} catch (err) {
		test(false, create(err.actual, err.expected, err.operator, err.message, x.notThrows));
	}
};

x.doesNotThrow = util.deprecate(x.notThrows, 't.doesNotThrow is renamed to t.notThrows. The old name still works, but will be removed in AVA 1.0.0. Update your references.');

x.regex = function (contents, regex, msg) {
	test(regex.test(contents), create(regex, contents, '===', msg, x.regex));
};

x.ifError = x.error = function (err, msg) {
	test(!err, create(err, 'Error', '!==', msg, x.ifError));
};
