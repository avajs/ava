'use strict';
var isPromise = require('is-promise');
var AvaError = require('./ava-error');

function noop() {}

module.exports = Sequence;

function Sequence(tests, bail) {
	if (!(this instanceof Sequence)) {
		throw new TypeError('Class constructor Sequence cannot be invoked without \'new\'');
	}

	if (!tests) {
		throw new Error('Sequence items can\'t be undefined');
	}

	this.results = [];
	this.passed = true;
	this.reason = null;
	this.tests = tests;
	this.bail = bail || false;

	// TODO(vdemedes): separate into a utility (it's being used in serveral places)
	Object.keys(Sequence.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);
}

Sequence.prototype.run = function () {
	var length = this.tests.length;

	for (var i = 0; i < length; i++) {
		// if last item failed and we should bail, return results and stop
		if (this.bail && !this.passed) {
			return this._results();
		}

		var result = this.tests[i].run();

		// if a Promise returned, we don't need to check for Promises after this test
		// so we can just use Promise.each() on the rest of the tests
		if (isPromise(result)) {
			return result
				.then(this._addResult)
				.return(this.tests.slice(i + 1))
				.each(this._runTest)
				.catch(AvaError, noop)
				.then(this._results);
		}

		try {
			this._addResult(result);
		} catch (err) {
			// in bail mode, don't execute the next tests
			if (err instanceof AvaError) {
				return this._results();
			}

			throw err;
		}
	}

	return this._results();
};

Sequence.prototype._runTest = function (test) {
	var result = test.run();

	if (isPromise(result)) {
		return result
			.then(this._addResult);
	}

	return this._addResult(result);
};

Sequence.prototype._addResult = function (result) {
	this.results.push(result);

	if (result.passed === false) {
		this.passed = false;

		// only set reason once
		if (!this.reason) {
			this.reason = result.reason;
		}

		if (this.bail) {
			throw new AvaError('Error in Sequence while in bail mode');
		}
	}

	return result;
};

Sequence.prototype._results = function () {
	return {
		passed: this.passed,
		reason: this.reason,
		result: this.results
	};
};
