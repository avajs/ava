'use strict';
var assert = require('core-assert');
var empower = require('empower');
var powerAssertFormatter = require('power-assert-formatter');
var powerAssertRenderers = require('power-assert-renderers');

var x = module.exports;

Object.defineProperty(x, 'AssertionError', {value: assert.AssertionError});

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

function enhanceAssert(assert) {
	empower(assert,
		powerAssertFormatter({
			renderers: [
				powerAssertRenderers.AssertionRenderer,
				powerAssertRenderers.SuccinctRenderer
			]
		}),
		{
			destructive: true,
			modifyMessageOnRethrow: true,
			saveContextOnRethrow: false,
			patterns: [
				't.ok(value, [message])',
				't.notOk(value, [message])',
				't.true(value, [message])',
				't.false(value, [message])',
				't.is(value, expected, [message])',
				't.not(value, expected, [message])',
				't.same(value, expected, [message])',
				't.notSame(value, expected, [message])',
				't.regexTest(regex, contents, [message])'
			]
		}
	);
}

x.pass = function (msg) {
	test(true, create(true, true, 'pass', msg, x.pass));
};

x.fail = function (msg) {
	test(false, create(false, false, 'fail', msg, x.fail));
};

x.ok = x.assert = function (val, msg) {
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
	try {
		assert.deepStrictEqual(val, expected, msg);
	} catch (err) {
		test(false, create(val, expected, '===', msg, x.same));
	}
};

x.notSame = function (val, expected, msg) {
	try {
		assert.notDeepStrictEqual(val, expected, msg);
	} catch (err) {
		test(false, create(val, expected, '!==', msg, x.notSame));
	}
};

x.throws = function (fn, err, msg) {
	if (fn && fn.then) {
		var isFailed = false;

		return fn
			.catch(function (err) {
				isFailed = true;

				return err;
			})
			.then(function (fnErr) {
				if (!isFailed) {
					x.throws(function () {}, err, msg);
				}

				x.throws(function () {
					throw fnErr;
				}, err, msg);
			});
	}

	try {
		assert.throws(fn, err, msg);
	} catch (err) {
		test(false, create(err.actual, err.expected, err.operator, err.message, x.throws));
	}
};

x.doesNotThrow = function (fn, msg) {
	if (fn && fn.then) {
		return fn
			.catch(function (err) {
				x.doesNotThrow(function () {
					throw err;
				}, msg);
			});
	}

	try {
		assert.doesNotThrow(fn, msg);
	} catch (err) {
		test(false, create(err.actual, err.expected, err.operator, err.message, x.doesNotThrow));
	}
};

x.regexTest = function (regex, contents, msg) {
	test(regex.test(contents), create(regex, contents, '===', msg, x.regexTest));
};

x.ifError = x.error = function (err, msg) {
	test(!err, create(err, 'Error', '!==', msg, x.ifError));
};

enhanceAssert(x);
