'use strict';

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
				const passedOrPromise = next.value.run();
				if (!passedOrPromise) {
					allPassed = false;

					if (this.bail) {
						// Stop if the test failed and bail mode is on.
						break;
					}
				} else if (passedOrPromise !== true) {
					promise = passedOrPromise;
					break;
				}
			}

			if (!promise) {
				return allPassed;
			}

			return promise.then(passed => {
				if (!passed) {
					allPassed = false;

					if (this.bail) {
						// Stop if the test failed and bail mode is on.
						return false;
					}
				}

				return runNext();
			});
		};

		return runNext();
	}
}

module.exports = Sequence;
