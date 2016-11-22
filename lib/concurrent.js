'use strict';
const Promise = require('bluebird');
const isPromise = require('is-promise');
const autoBind = require('auto-bind');
const AvaError = require('./ava-error');

function noop() {}

module.exports = Concurrent;

function Concurrent(tests, bail) {
	if (!(this instanceof Concurrent)) {
		throw new TypeError('Class constructor Concurrent cannot be invoked without \'new\'');
	}

	if (!Array.isArray(tests)) {
		throw new TypeError('Expected an array of tests');
	}

	this.results = [];
	this.passed = true;
	this.reason = null;
	this.tests = tests;
	this.bail = bail || false;

	autoBind(this);
}

Concurrent.prototype.run = function () {
	let results;

	try {
		results = this.tests.map(this._runTest);
	} catch (err) {
		if (err instanceof AvaError) {
			return this._results();
		}

		throw err;
	}

	const isAsync = results.some(isPromise);

	if (isAsync) {
		return Promise.all(results)
			.catch(AvaError, noop)
			.then(this._results);
	}

	return this._results();
};

Concurrent.prototype._runTest = function (test, index) {
	const result = test.run();

	if (isPromise(result)) {
		return result.then(result => this._addResult(result, index));
	}

	return this._addResult(result, index);
};

Concurrent.prototype._addResult = function (result, index) {
	// always save result when not in bail mode or all previous tests pass
	if ((this.bail && this.passed) || !this.bail) {
		this.results[index] = result;
	}

	if (result.passed === false) {
		this.passed = false;

		// only set reason once
		if (!this.reason) {
			this.reason = result.reason;
		}

		if (this.bail) {
			throw new AvaError('Error in Concurrent while in bail mode');
		}
	}

	return result;
};

Concurrent.prototype._results = function () {
	return {
		passed: this.passed,
		reason: this.reason,
		result: this.results
	};
};
