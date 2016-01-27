'use strict';
var Promise = require('bluebird');
var isPromise = require('is-promise');

module.exports = Sequence;

function Sequence(tests, bail) {
	if (!this instanceof Sequence) {
		throw new TypeError('Class constructor Sequence cannot be invoked without \'new\'');
	}

	this.tests = tests;
	this.bail = bail;
}

Sequence.prototype.run = function () {
	var bail = this.bail;
	var tests = this.tests;
	var len = tests.length;

	var results = [];
	var passed = true;
	var reason = null;

	for (var i = 0; i < len; i++) {
		var test = tests[i];
		var result = test.run();

		if (isPromise(result)) {
			return this._runAsync(results, result, tests.slice(i + 1));
		}

		results.push(result);

		if (!result.passed) {
			if (bail) {
				return {
					passed: false,
					result: results,
					reason: result.reason
				};
			} else if (passed) {
				passed = false;
				reason = result.reason;
			}
		}
	}

	return {
		passed: passed,
		reason: reason,
		result: results
	};
};

var BAIL_ERROR = new Error();

Sequence.prototype._runAsync = function (results, firstAsyncResult, remaining) {
	var bail = this.bail;
	var passed = true;
	var reason = null;

	function processResult(result) {
		results.push(result);

		if (!result.passed) {
			if (passed) {
				passed = false;
				reason = result.reason;
			}

			if (bail) {
				throw BAIL_ERROR;
			}
		}
	}

	var result = firstAsyncResult.then(function (firstResult) {
		processResult(firstResult);

		return Promise.each(remaining, function (test) {
			var result = test.run();

			if (isPromise(result)) {
				return result.then(processResult);
			}

			processResult(result);
		});
	});

	if (bail) {
		result = result.catch(function (err) {
			if (err !== BAIL_ERROR) {
				throw err;
			}
		});
	}

	return result.then(function () {
		return {
			passed: passed,
			reason: reason,
			result: results
		};
	});
};
