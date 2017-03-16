'use strict';
const isPromise = require('is-promise');

class Concurrent {
	constructor(runnables, bail) {
		if (!Array.isArray(runnables)) {
			throw new TypeError('Expected an array of runnables');
		}

		this.runnables = runnables;
		this.bail = bail || false;
	}

	run() {
		let allPassed = true;

		let pending;
		let rejectPending;
		let resolvePending;
		const allPromises = [];
		const handlePromise = promise => {
			if (!pending) {
				pending = new Promise((resolve, reject) => {
					rejectPending = reject;
					resolvePending = resolve;
				});
			}

			allPromises.push(promise.then(result => {
				if (!result.passed) {
					allPassed = false;

					if (this.bail) {
						// Stop if the test failed and bail mode is on.
						resolvePending();
					}
				}
			}, rejectPending));
		};

		for (const runnable of this.runnables) {
			const result = runnable.run();

			if (isPromise(result)) {
				handlePromise(result);
			} else if (!result.passed) {
				if (this.bail) {
					// Stop if the test failed and bail mode is on.
					return {passed: false};
				}

				allPassed = false;
			}
		}

		if (pending) {
			Promise.all(allPromises).then(resolvePending);
			return pending.then(() => ({passed: allPassed}));
		}

		return {passed: allPassed};
	}
}

module.exports = Concurrent;
