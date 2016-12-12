'use strict';
const isPromise = require('is-promise');
const autoBind = require('auto-bind');
const AvaError = require('./ava-error');

class Sequence {
	constructor(tests, bail) {
		if (!tests) {
			throw new Error('Sequence items can\'t be undefined');
		}

		this.results = [];
		this.passed = true;
		this.reason = null;
		this.tests = tests;
		this.bail = bail || false;

		autoBind(this);
	}
	run() {
		const length = this.tests.length;

		for (let i = 0; i < length; i++) {
			// If last item failed and we should bail, return results and stop
			if (this.bail && !this.passed) {
				return this._results();
			}

			const result = this.tests[i].run();

			// If a Promise returned, we don't need to check for Promises after this test
			// so we can just use Promise.each() on the rest of the tests
			if (isPromise(result)) {
				return result
					.then(this._addResult)
					.return(this.tests.slice(i + 1))
					.each(this._runTest)
					.catch(AvaError, () => {})
					.then(this._results);
			}

			try {
				this._addResult(result);
			} catch (err) {
				// In bail mode, don't execute the next tests
				if (err instanceof AvaError) {
					return this._results();
				}

				throw err;
			}
		}

		return this._results();
	}
	_runTest(test) {
		const result = test.run();
		return isPromise(result) ? result.then(this._addResult) : this._addResult(result);
	}
	_addResult(result) {
		this.results.push(result);

		if (result.passed === false) {
			this.passed = false;

			// Only set reason once
			if (!this.reason) {
				this.reason = result.reason;
			}

			if (this.bail) {
				throw new AvaError('Error in Sequence while in bail mode');
			}
		}

		return result;
	}
	_results() {
		return {
			passed: this.passed,
			reason: this.reason,
			result: this.results
		};
	}
}

module.exports = Sequence;
