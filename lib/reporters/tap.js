'use strict';
const os = require('os');
const path = require('path');

const plur = require('plur');
const stripAnsi = require('strip-ansi');
const supertap = require('supertap');
const indentString = require('indent-string');

const beautifyStack = require('./beautify-stack');
const prefixTitle = require('./prefix-title');

function dumpError(error) {
	const object = {...error.object};
	if (error.name) {
		object.name = error.name;
	}

	if (error.message) {
		object.message = error.message;
	}

	if (error.avaAssertionError) {
		if (error.assertion) {
			object.assertion = error.assertion;
		}

		if (error.operator) {
			object.operator = error.operator;
		}

		if (error.values.length > 0) {
			object.values = error.values.reduce((acc, value) => { // eslint-disable-line unicorn/no-reduce
				acc[value.label] = stripAnsi(value.formatted);
				return acc;
			}, {});
		}
	}

	if (error.nonErrorObject) {
		object.message = 'Non-error object';
		object.formatted = stripAnsi(error.formatted);
	}

	if (error.stack) {
		object.at = error.shouldBeautifyStack ? beautifyStack(error.stack).join('\n') : error.stack;
	}

	return object;
}

class TapReporter {
	constructor(options) {
		this.i = 0;

		this.stdStream = options.stdStream;
		this.reportStream = options.reportStream;

		this.crashCount = 0;
		this.filesWithMissingAvaImports = new Set();
		this.prefixTitle = (testFile, title) => title;
		this.relativeFile = file => path.relative(options.projectDir, file);
		this.stats = null;
	}

	startRun(plan) {
		if (plan.files.length > 1) {
			this.prefixTitle = (testFile, title) => prefixTitle(plan.filePathPrefix, testFile, title);
		}

		plan.status.on('stateChange', evt => this.consumeStateChange(evt));

		this.reportStream.write(supertap.start() + os.EOL);
	}

	endRun() {
		if (this.stats) {
			this.reportStream.write(supertap.finish({
				crashed: this.crashCount,
				failed: this.stats.failedTests + this.stats.remainingTests,
				passed: this.stats.passedTests + this.stats.passedKnownFailingTests,
				skipped: this.stats.skippedTests,
				todo: this.stats.todoTests
			}) + os.EOL);

			if (this.stats.parallelRuns) {
				const {currentFileCount, currentIndex, totalRuns} = this.stats.parallelRuns;
				this.reportStream.write(`# Ran ${currentFileCount} test ${plur('file', currentFileCount)} out of ${this.stats.files} for job ${currentIndex + 1} of ${totalRuns}` + os.EOL + os.EOL);
			}
		} else {
			this.reportStream.write(supertap.finish({
				crashed: this.crashCount,
				failed: 0,
				passed: 0,
				skipped: 0,
				todo: 0
			}) + os.EOL);
		}
	}

	writeTest(evt, flags) {
		this.reportStream.write(supertap.test(this.prefixTitle(evt.testFile, evt.title), {
			comment: evt.logs,
			error: evt.err ? dumpError(evt.err) : null,
			index: ++this.i,
			passed: flags.passed,
			skip: flags.skip,
			todo: flags.todo
		}) + os.EOL);
	}

	writeCrash(evt, title) {
		this.crashCount++;
		this.reportStream.write(supertap.test(title || evt.err.summary || evt.type, {
			comment: evt.logs,
			error: evt.err ? dumpError(evt.err) : null,
			index: ++this.i,
			passed: false,
			skip: false,
			todo: false
		}) + os.EOL);
	}

	writeComment(evt, {title = this.prefixTitle(evt.testFile, evt.title)}) {
		this.reportStream.write(`# ${stripAnsi(title)}${os.EOL}`);
		if (evt.logs) {
			for (const log of evt.logs) {
				const logLines = indentString(log, 4).replace(/^ {4}/gm, '#   ');
				this.reportStream.write(`${logLines}${os.EOL}`);
			}
		}
	}

	writeTimeout(evt) {
		const err = new Error(`Exited because no new tests completed within the last ${evt.period}ms of inactivity`);

		for (const [testFile, tests] of evt.pendingTests) {
			for (const title of tests) {
				this.writeTest({testFile, title, err}, {passed: false, todo: false, skip: false});
			}
		}
	}

	consumeStateChange(evt) { // eslint-disable-line complexity
		const fileStats = this.stats && evt.testFile ? this.stats.byFile.get(evt.testFile) : null;

		switch (evt.type) {
			case 'declared-test':
				// Ignore
				break;
			case 'hook-failed':
				this.writeTest(evt, {passed: false, todo: false, skip: false});
				break;
			case 'hook-finished':
				this.writeComment(evt, {});
				break;
			case 'internal-error':
				this.writeCrash(evt);
				break;
			case 'missing-ava-import':
				this.filesWithMissingAvaImports.add(evt.testFile);
				this.writeCrash(evt, `No tests found in ${this.relativeFile(evt.testFile)}, make sure to import "ava" at the top of your test file`);
				break;
			case 'selected-test':
				if (evt.skip) {
					this.writeTest(evt, {passed: true, todo: false, skip: true});
				} else if (evt.todo) {
					this.writeTest(evt, {passed: false, todo: true, skip: false});
				}

				break;
			case 'snapshot-error':
				this.writeComment(evt, {title: 'Could not update snapshots'});
				break;
			case 'stats':
				this.stats = evt.stats;
				break;
			case 'test-failed':
				this.writeTest(evt, {passed: false, todo: false, skip: false});
				break;
			case 'test-passed':
				this.writeTest(evt, {passed: true, todo: false, skip: false});
				break;
			case 'timeout':
				this.writeTimeout(evt);
				break;
			case 'uncaught-exception':
				this.writeCrash(evt);
				break;
			case 'unhandled-rejection':
				this.writeCrash(evt);
				break;
			case 'worker-failed':
				if (!this.filesWithMissingAvaImports.has(evt.testFile)) {
					if (evt.nonZeroExitCode) {
						this.writeCrash(evt, `${this.relativeFile(evt.testFile)} exited with a non-zero exit code: ${evt.nonZeroExitCode}`);
					} else {
						this.writeCrash(evt, `${this.relativeFile(evt.testFile)} exited due to ${evt.signal}`);
					}
				}

				break;
			case 'worker-finished':
				if (!evt.forcedExit && !this.filesWithMissingAvaImports.has(evt.testFile)) {
					if (fileStats.declaredTests === 0) {
						this.writeCrash(evt, `No tests found in ${this.relativeFile(evt.testFile)}`);
					} else if (!this.failFastEnabled && fileStats.remainingTests > 0) {
						this.writeComment(evt, {title: `${fileStats.remainingTests} ${plur('test', fileStats.remainingTests)} remaining in ${this.relativeFile(evt.testFile)}`});
					}
				}

				break;
			case 'worker-stderr':
			case 'worker-stdout':
				this.stdStream.write(evt.chunk);
				break;
			default:
				break;
		}
	}
}
module.exports = TapReporter;
