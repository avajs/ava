'use strict';

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

			allPromises.push(promise.then(passed => {
				if (!passed) {
					allPassed = false;

					if (this.bail) {
						// Stop if the test failed and bail mode is on.
						resolvePending();
					}
				}
			}, rejectPending));
		};

		for (const runnable of this.runnables) {
			const passedOrPromise = runnable.run();

			if (!passedOrPromise) {
				if (this.bail) {
					// Stop if the test failed and bail mode is on.
					return false;
				}

				allPassed = false;
			} else if (passedOrPromise !== true) {
				handlePromise(passedOrPromise);
			}
		}

		if (pending) {
			Promise.all(allPromises).then(resolvePending);
			return pending.then(() => allPassed);
		}

		return allPassed;
	}
}

module.exports = Concurrent;
