'use strict';
var isPromise = require('is-promise');

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
}

Sequence.prototype.run = function () {
	return this._run();
};

// run sequence items starting from specified index
Sequence.prototype._run = function (fromIndex) {
	var length = this.tests.length;

	if (!fromIndex) {
		fromIndex = 0;
	}

	for (var i = fromIndex; i < length; i++) {
		// if last item failed and we should bail, return results and stop
		if (this.bail && !this.passed) {
			return this._results();
		}

		var result = this.tests[i].run();

		if (isPromise(result)) {
			return this._awaitResult(result, i + 1);
		}

		this._addResult(result);
	}

	return this._results();
};

// if result is a Promise, return it to make Sequence thennable
// add resolved result and continue execution from the next item
Sequence.prototype._awaitResult = function (result, nextIndex) {
	var self = this;

	return result.then(function (ret) {
		self._addResult(ret);

		return self._run(nextIndex);
	});
};

Sequence.prototype._addResult = function (result) {
	this.results.push(result);

	if (result.passed === false) {
		this.passed = false;

		// only set reason once
		if (!this.reason) {
			this.reason = result.reason;
		}
	}
};

Sequence.prototype._results = function () {
	return {
		passed: this.passed,
		reason: this.reason,
		result: this.results
	};
};
