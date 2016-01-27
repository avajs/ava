'use strict';
var Promise = require('bluebird');
var isPromise = require('is-promise');
var BAIL_ERROR = new Error();

module.exports = Concurrent;

function Concurrent(tests, bail) {
	if (!this instanceof Concurrent) {
		throw new TypeError('Class constructor Concurrent cannot be invoked without \'new\'');
	}

	this.tests = tests;
	this.bail = bail;
}

Concurrent.prototype.run = function () {
	var bail = this.bail;
	var tests = this.tests;
	var sync = true;
	var passed = true;
	var reason;

	var results = [];

	function addAsync(result) {
		if (!result.passed) {
			if (passed) {
				passed = false;
				reason = result.reason;

				if (bail) {
					throw BAIL_ERROR;
				}
			}
		}

		return result;
	}

	for (var i = 0; i < tests.length; i++) {
		var result = tests[i].run();

		if (isPromise(result)) {
			sync = false;
			results.push(result.then(addAsync));
		} else {
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
	}

	if (sync) {
		return {
			passed: passed,
			reason: reason,
			result: results
		};
	}

	var ret = Promise.all(results).then(function (results) {
		return {
			passed: passed,
			reason: reason,
			result: results
		};
	});

	if (bail) {
		ret = ret.catch(function (err) {
			if (err !== BAIL_ERROR) {
				throw err;
			}

			return {
				passed: false,
				reason: reason
			};
		});
	}

	return ret;
};
