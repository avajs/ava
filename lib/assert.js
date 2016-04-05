'use strict';
var util = require('util');
var assert = require('core-assert');
var deepEqual = require('only-shallow');
var observableToPromise = require('observable-to-promise');
var isObservable = require('is-observable');
var isPromise = require('is-promise');
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

x.truthy = function (val, msg) {
	test(val, create(val, true, '==', msg, x.truthy));
};

x.falsy = function (val, msg) {
	test(!val, create(val, false, '==', msg, x.falsy));
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

x.deepEqual = function (val, expected, msg) {
	test(deepEqual(val, expected), create(val, expected, '===', msg, x.deepEqual));
};

x.notDeepEqual = function (val, expected, msg) {
	test(!deepEqual(val, expected), create(val, expected, '!==', msg, x.notDeepEqual));
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
				return x.throws(function () {
					throw fnErr;
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

		var result;

		assert.throws(function () {
			try {
				fn();
			} catch (error) {
				result = error;
				throw error;
			}
		}, err, msg);

		return result;
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

x.regex = function (contents, regex, msg) {
	test(regex.test(contents), create(regex, contents, '===', msg, x.regex));
};

x.ifError = x.error = function (err, msg) {
	test(!err, create(err, 'Error', '!==', msg, x.ifError));
};

/*
 * deprecated APIs
 */
x.doesNotThrow = util.deprecate(x.notThrows, getDeprecationNotice('doesNotThrow()', 'notThrows()'));
x.ok = util.deprecate(x.truthy, getDeprecationNotice('ok()', 'truthy()'));
x.notOk = util.deprecate(x.falsy, getDeprecationNotice('notOk()', 'falsy()'));
x.same = util.deprecate(x.deepEqual, getDeprecationNotice('same()', 'deepEqual()'));
x.notSame = util.deprecate(x.notDeepEqual, getDeprecationNotice('notSame()', 'notDeepEqual()'));

function getDeprecationNotice(oldApi, newApi) {
	return 'DEPRECATION NOTICE: ' + oldApi + ' has been renamed to ' + newApi + ' and will eventually be removed. See https://github.com/jamestalmage/ava-codemods to help upgrade your codebase automatically.';
}
