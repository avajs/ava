'use strict';
const isPromise = require('is-promise');

class Sequence {
	constructor(runnables, bail) {
		if (!Array.isArray(runnables)) {
			throw new TypeError('Expected an array of runnables');
		}

		this.runnables = runnables;
		this.bail = bail || false;
	}

	run() {
		const iterator = this.runnables[Symbol.iterator]();

		let allPassed = true;
		const runNext = () => {
			let promise;

			for (let next = iterator.next(); !next.done; next = iterator.next()) {
				const result = next.value.run();
				if (isPromise(result)) {
					promise = result;
					break;
				}

				if (!result.passed) {
					allPassed = false;

					if (this.bail) {
						// Stop if the test failed and bail mode is on.
						break;
					}
				}
			}

			if (!promise) {
				return {passed: allPassed};
			}

			return promise.then(result => {
				if (!result.passed) {
					allPassed = false;

					if (this.bail) {
						// Stop if the test failed and bail mode is on.
						return {passed: false};
					}
				}

				return runNext();
			});
		};

		return runNext();
	}
}

module.exports = Sequence;
