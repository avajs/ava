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

		let activeRunnable;
		const onBeforeExit = () => {
			if (activeRunnable.finishDueToInactivity) {
				activeRunnable.finishDueToInactivity();
			}
		};
		process.on('beforeExit', onBeforeExit);

		let allPassed = true;
		const finish = () => {
			process.removeListener('beforeExit', onBeforeExit);
			return allPassed;
		};

		const runNext = () => {
			let promise;

			for (let next = iterator.next(); !next.done; next = iterator.next()) {
				activeRunnable = next.value;
				const passedOrPromise = activeRunnable.run();
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
				return finish();
			}

			return promise.then(passed => {
				if (!passed) {
					allPassed = false;

					if (this.bail) {
						// Stop if the test failed and bail mode is on.
						return finish();
					}
				}

				return runNext();
			});
		};

		return runNext();
	}
}

module.exports = Sequence;
