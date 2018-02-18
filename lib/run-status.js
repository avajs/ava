'use strict';
const cloneDeep = require('lodash.clonedeep');
const Emittery = require('./emittery');

class RunStatus extends Emittery {
	constructor(files) {
		super();

		this.stats = {
			byFile: new Map(),
			declaredTests: 0,
			failedHooks: 0,
			failedTests: 0,
			failedWorkers: 0,
			files,
			finishedWorkers: 0,
			internalErrors: 0,
			remainingTests: 0,
			passedKnownFailingTests: 0,
			passedTests: 0,
			selectedTests: 0,
			skippedTests: 0,
			timeouts: 0,
			todoTests: 0,
			uncaughtExceptions: 0,
			unhandledRejections: 0
		};
	}

	observeWorker(worker, testFile) {
		this.stats.byFile.set(testFile, {
			declaredTests: 0,
			failedHooks: 0,
			failedTests: 0,
			internalErrors: 0,
			remainingTests: 0,
			passedKnownFailingTests: 0,
			passedTests: 0,
			selectedTests: 0,
			skippedTests: 0,
			todoTests: 0,
			uncaughtExceptions: 0,
			unhandledRejections: 0
		});
		worker.onStateChange(data => this.emitStateChange(data));
	}

	emitStateChange(evt) {
		const stats = this.stats;
		const fileStats = this.stats.byFile.get(evt.testFile);

		let changedStats = true;
		switch (evt.type) {
			case 'declared-test':
				stats.declaredTests++;
				fileStats.declaredTests++;
				break;
			case 'hook-failed':
				stats.failedHooks++;
				fileStats.failedHooks++;
				break;
			case 'internal-error':
				stats.internalErrors++;
				if (evt.testFile) {
					fileStats.internalErrors++;
				}
				break;
			case 'selected-test':
				stats.selectedTests++;
				fileStats.selectedTests++;
				if (evt.skip) {
					stats.skippedTests++;
					fileStats.skippedTests++;
				} else if (evt.todo) {
					stats.todoTests++;
					fileStats.todoTests++;
				} else {
					stats.remainingTests++;
					fileStats.remainingTests++;
				}
				break;
			case 'test-failed':
				stats.failedTests++;
				fileStats.failedTests++;
				stats.remainingTests--;
				fileStats.remainingTests--;
				break;
			case 'test-passed':
				if (evt.knownFailing) {
					stats.passedKnownFailingTests++;
					fileStats.passedKnownFailingTests++;
				} else {
					stats.passedTests++;
					fileStats.passedTests++;
				}
				stats.remainingTests--;
				fileStats.remainingTests--;
				break;
			case 'timeout':
				stats.timeouts++;
				break;
			case 'uncaught-exception':
				stats.uncaughtExceptions++;
				fileStats.uncaughtExceptions++;
				break;
			case 'unhandled-rejection':
				stats.unhandledRejections++;
				fileStats.unhandledRejections++;
				break;
			case 'worker-failed':
				stats.failedWorkers++;
				break;
			case 'worker-finished':
				stats.finishedWorkers++;
				break;
			default:
				changedStats = false;
				break;
		}

		if (changedStats) {
			this.emit('stateChange', {type: 'stats', stats: cloneDeep(stats)});
		}
		this.emit('stateChange', evt);
	}

	suggestExitCode(circumstances) {
		if (circumstances.matching && this.stats.selectedTests === 0) {
			return 1;
		}

		if (
			this.stats.declaredTests === 0 ||
			this.stats.internalErrors > 0 ||
			this.stats.failedHooks > 0 ||
			this.stats.failedTests > 0 ||
			this.stats.failedWorkers > 0 ||
			this.stats.timeouts > 0 ||
			this.stats.uncaughtExceptions > 0 ||
			this.stats.unhandledRejections > 0
		) {
			return 1;
		}

		return 0;
	}
}
module.exports = RunStatus;
