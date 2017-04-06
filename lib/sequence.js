'use strict';

const beforeExitSubscribers = new Set();
const beforeExitHandler = () => {
	for (const subscriber of beforeExitSubscribers) {
		subscriber();
	}
};
const onBeforeExit = subscriber => {
	if (beforeExitSubscribers.size === 0) {
		// Only listen for the event once, no matter how many Sequences are run
		// concurrently.
		process.on('beforeExit', beforeExitHandler);
	}

	beforeExitSubscribers.add(subscriber);
	return {
		dispose() {
			beforeExitSubscribers.delete(subscriber);
			if (beforeExitSubscribers.size === 0) {
				process.removeListener('beforeExit', beforeExitHandler);
			}
		}
	};
};

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
		const beforeExit = onBeforeExit(() => {
			if (activeRunnable.finishDueToInactivity) {
				activeRunnable.finishDueToInactivity();
			}
		});

		let allPassed = true;
		const finish = () => {
			beforeExit.dispose();
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
