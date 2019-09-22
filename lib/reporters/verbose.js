'use strict';
const os = require('os');
const path = require('path');
const stream = require('stream');

const figures = require('figures');
const indentString = require('indent-string');
const plur = require('plur');
const prettyMs = require('pretty-ms');
const trimOffNewlines = require('trim-off-newlines');

const chalk = require('../chalk').get();
const codeExcerpt = require('../code-excerpt');
const colors = require('./colors');
const formatSerializedError = require('./format-serialized-error');
const improperUsageMessages = require('./improper-usage-messages');
const prefixTitle = require('./prefix-title');
const whileCorked = require('./while-corked');

class LineWriter extends stream.Writable {
	constructor(dest) {
		super();

		this.dest = dest;
		this.columns = dest.columns || 80;
		this.lastLineIsEmpty = false;
	}

	_write(chunk, encoding, callback) {
		this.dest.write(chunk);
		callback();
	}

	writeLine(str) {
		if (str) {
			this.write(indentString(str, 2) + os.EOL);
			this.lastLineIsEmpty = false;
		} else {
			this.write(os.EOL);
			this.lastLineIsEmpty = true;
		}
	}

	ensureEmptyLine() {
		if (!this.lastLineIsEmpty) {
			this.writeLine();
		}
	}
}

class VerboseReporter {
	constructor(options) {
		this.reportStream = options.reportStream;
		this.stdStream = options.stdStream;
		this.watching = options.watching;

		this.lineWriter = new LineWriter(this.reportStream);
		this.consumeStateChange = whileCorked(this.reportStream, this.consumeStateChange);
		this.endRun = whileCorked(this.reportStream, this.endRun);

		this.reset();
	}

	reset() {
		if (this.removePreviousListener) {
			this.removePreviousListener();
		}

		this.failFastEnabled = false;
		this.failures = [];
		this.filesWithMissingAvaImports = new Set();
		this.knownFailures = [];
		this.runningTestFiles = new Map();
		this.lastLineIsEmpty = false;
		this.matching = false;
		this.prefixTitle = (testFile, title) => title;
		this.previousFailures = 0;
		this.removePreviousListener = null;
		this.stats = null;
	}

	startRun(plan) {
		this.reset();

		this.failFastEnabled = plan.failFastEnabled;
		this.matching = plan.matching;
		this.previousFailures = plan.previousFailures;

		if (this.watching || plan.files.length > 1) {
			this.prefixTitle = (testFile, title) => prefixTitle(plan.filePathPrefix, testFile, title);
		}

		this.removePreviousListener = plan.status.on('stateChange', evt => this.consumeStateChange(evt));

		if (this.watching && plan.runVector > 1) {
			this.lineWriter.write(chalk.gray.dim('\u2500'.repeat(this.reportStream.columns || 80)) + os.EOL);
		}

		this.lineWriter.writeLine();
	}

	consumeStateChange(evt) { // eslint-disable-line complexity
		const fileStats = this.stats && evt.testFile ? this.stats.byFile.get(evt.testFile) : null;

		switch (evt.type) {
			case 'hook-failed':
				this.failures.push(evt);
				this.writeTestSummary(evt);
				break;
			case 'internal-error':
				if (evt.testFile) {
					this.lineWriter.writeLine(colors.error(`${figures.cross} Internal error when running ${path.relative('.', evt.testFile)}`));
				} else {
					this.lineWriter.writeLine(colors.error(`${figures.cross} Internal error`));
				}

				this.lineWriter.writeLine(colors.stack(evt.err.summary));
				this.lineWriter.writeLine(colors.errorStack(evt.err.stack));
				this.lineWriter.writeLine();
				this.lineWriter.writeLine();
				break;
			case 'missing-ava-import':
				this.filesWithMissingAvaImports.add(evt.testFile);
				this.lineWriter.writeLine(colors.error(`${figures.cross} No tests found in ${path.relative('.', evt.testFile)}, make sure to import "ava" at the top of your test file`));
				break;
			case 'hook-finished':
				if (evt.logs.length > 0) {
					this.lineWriter.writeLine(`  ${this.prefixTitle(evt.testFile, evt.title)}`);
					this.writeLogs(evt);
				}

				break;
			case 'selected-test':
				if (evt.skip) {
					this.lineWriter.writeLine(colors.skip(`- ${this.prefixTitle(evt.testFile, evt.title)}`));
				} else if (evt.todo) {
					this.lineWriter.writeLine(colors.todo(`- ${this.prefixTitle(evt.testFile, evt.title)}`));
				}

				break;
			case 'stats':
				this.stats = evt.stats;
				break;
			case 'test-failed':
				this.failures.push(evt);
				this.writeTestSummary(evt);
				break;
			case 'test-passed':
				if (evt.knownFailing) {
					this.knownFailures.push(evt);
				}

				this.writeTestSummary(evt);
				break;
			case 'timeout':
				this.lineWriter.writeLine(colors.error(`\n${figures.cross} Timed out while running tests`));
				this.lineWriter.writeLine('');
				this.writePendingTests(evt);
				break;
			case 'interrupt':
				this.lineWriter.writeLine(colors.error(`\n${figures.cross} Exiting due to SIGINT`));
				this.lineWriter.writeLine('');
				this.writePendingTests(evt);
				break;
			case 'uncaught-exception':
				this.lineWriter.ensureEmptyLine();
				this.lineWriter.writeLine(colors.title(`Uncaught exception in ${path.relative('.', evt.testFile)}`));
				this.lineWriter.writeLine();
				this.writeErr(evt);
				this.lineWriter.writeLine();
				break;
			case 'unhandled-rejection':
				this.lineWriter.ensureEmptyLine();
				this.lineWriter.writeLine(colors.title(`Unhandled rejection in ${path.relative('.', evt.testFile)}`));
				this.lineWriter.writeLine();
				this.writeErr(evt);
				this.lineWriter.writeLine();
				break;
			case 'worker-failed':
				if (!this.filesWithMissingAvaImports.has(evt.testFile)) {
					if (evt.nonZeroExitCode) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} ${path.relative('.', evt.testFile)} exited with a non-zero exit code: ${evt.nonZeroExitCode}`));
					} else {
						this.lineWriter.writeLine(colors.error(`${figures.cross} ${path.relative('.', evt.testFile)} exited due to ${evt.signal}`));
					}
				}

				break;
			case 'worker-finished':
				if (!evt.forcedExit && !this.filesWithMissingAvaImports.has(evt.testFile)) {
					if (fileStats.declaredTests === 0) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} No tests found in ${path.relative('.', evt.testFile)}`));
					} else if (!this.failFastEnabled && fileStats.remainingTests > 0) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} ${fileStats.remainingTests} ${plur('test', fileStats.remainingTests)} remaining in ${path.relative('.', evt.testFile)}`));
					}
				}

				break;
			case 'worker-stderr':
			case 'worker-stdout':
				this.stdStream.write(evt.chunk);
				// If the chunk does not end with a linebreak, *forcibly* write one to
				// ensure it remains visible in the TTY.
				// Tests cannot assume their standard output is not interrupted. Indeed
				// we multiplex stdout and stderr into a single stream. However as
				// long as stdStream is different from reportStream users can read
				// their original output by redirecting the streams.
				if (evt.chunk[evt.chunk.length - 1] !== 0x0A) {
					this.reportStream.write(os.EOL);
				}

				break;
			default:
				break;
		}
	}

	writeErr(evt) {
		if (evt.err.name === 'TSError' && evt.err.object && evt.err.object.diagnosticText) {
			this.lineWriter.writeLine(colors.errorStack(trimOffNewlines(evt.err.object.diagnosticText)));
			return;
		}

		if (evt.err.source) {
			this.lineWriter.writeLine(colors.errorSource(`${evt.err.source.file}:${evt.err.source.line}`));
			const excerpt = codeExcerpt(evt.err.source, {maxWidth: this.reportStream.columns - 2});
			if (excerpt) {
				this.lineWriter.writeLine();
				this.lineWriter.writeLine(excerpt);
			}
		}

		if (evt.err.avaAssertionError) {
			const result = formatSerializedError(evt.err);
			if (result.printMessage) {
				this.lineWriter.writeLine();
				this.lineWriter.writeLine(evt.err.message);
			}

			if (result.formatted) {
				this.lineWriter.writeLine();
				this.lineWriter.writeLine(result.formatted);
			}

			const message = improperUsageMessages.forError(evt.err);
			if (message) {
				this.lineWriter.writeLine();
				this.lineWriter.writeLine(message);
			}
		} else if (evt.err.nonErrorObject) {
			this.lineWriter.writeLine(trimOffNewlines(evt.err.formatted));
		} else {
			this.lineWriter.writeLine();
			this.lineWriter.writeLine(evt.err.summary);
		}

		if (evt.err.stack) {
			const {stack} = evt.err;
			if (stack.includes('\n')) {
				this.lineWriter.writeLine();
				this.lineWriter.writeLine(colors.errorStack(stack));
			}
		}
	}

	writePendingTests(evt) {
		for (const [file, testsInFile] of evt.pendingTests) {
			if (testsInFile.size === 0) {
				continue;
			}

			this.lineWriter.writeLine(`${testsInFile.size} tests were pending in ${file}\n`);
			for (const title of testsInFile) {
				this.lineWriter.writeLine(`${figures.circleDotted} ${this.prefixTitle(file, title)}`);
			}

			this.lineWriter.writeLine('');
		}
	}

	writeLogs(evt) {
		if (evt.logs) {
			for (const log of evt.logs) {
				const logLines = indentString(colors.log(log), 4);
				const logLinesWithLeadingFigure = logLines.replace(
					/^ {4}/,
					`  ${colors.information(figures.info)} `
				);
				this.lineWriter.writeLine(logLinesWithLeadingFigure);
			}
		}
	}

	writeTestSummary(evt) {
		if (evt.type === 'hook-failed' || evt.type === 'test-failed') {
			this.lineWriter.writeLine(`${colors.error(figures.cross)} ${this.prefixTitle(evt.testFile, evt.title)} ${colors.error(evt.err.message)}`);
		} else if (evt.knownFailing) {
			this.lineWriter.writeLine(`${colors.error(figures.tick)} ${colors.error(this.prefixTitle(evt.testFile, evt.title))}`);
		} else {
			// Display duration only over a threshold
			const threshold = 100;
			const duration = evt.duration > threshold ? colors.duration(' (' + prettyMs(evt.duration) + ')') : '';

			this.lineWriter.writeLine(`${colors.pass(figures.tick)} ${this.prefixTitle(evt.testFile, evt.title)}${duration}`);
		}

		this.writeLogs(evt);
	}

	writeFailure(evt) {
		this.lineWriter.writeLine(`${colors.title(this.prefixTitle(evt.testFile, evt.title))}`);
		this.writeLogs(evt);
		this.lineWriter.writeLine();
		this.writeErr(evt);
	}

	endRun() { // eslint-disable-line complexity
		if (!this.stats) {
			this.lineWriter.writeLine(colors.error(`${figures.cross} Couldn't find any files to test`));
			this.lineWriter.writeLine();
			return;
		}

		if (this.matching && this.stats.selectedTests === 0) {
			this.lineWriter.writeLine(colors.error(`${figures.cross} Couldn't find any matching tests`));
			this.lineWriter.writeLine();
			return;
		}

		this.lineWriter.writeLine();

		if (this.stats.parallelRuns) {
			const {currentFileCount, currentIndex, totalRuns} = this.stats.parallelRuns;
			this.lineWriter.writeLine(colors.information(`Ran ${currentFileCount} test ${plur('file', currentFileCount)} out of ${this.stats.files} for job ${currentIndex + 1} of ${totalRuns}`));
			this.lineWriter.writeLine();
		}

		let firstLinePostfix = this.watching ?
			' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']') :
			'';

		if (this.stats.failedHooks > 0) {
			this.lineWriter.writeLine(colors.error(`${this.stats.failedHooks} ${plur('hook', this.stats.failedHooks)} failed`) + firstLinePostfix);
			firstLinePostfix = '';
		}

		if (this.stats.failedTests > 0) {
			this.lineWriter.writeLine(colors.error(`${this.stats.failedTests} ${plur('test', this.stats.failedTests)} failed`) + firstLinePostfix);
			firstLinePostfix = '';
		}

		if (this.stats.failedHooks === 0 && this.stats.failedTests === 0 && this.stats.passedTests > 0) {
			this.lineWriter.writeLine(colors.pass(`${this.stats.passedTests} ${plur('test', this.stats.passedTests)} passed`) + firstLinePostfix);
			firstLinePostfix = '';
		}

		if (this.stats.passedKnownFailingTests > 0) {
			this.lineWriter.writeLine(colors.error(`${this.stats.passedKnownFailingTests} ${plur('known failure', this.stats.passedKnownFailingTests)}`));
		}

		if (this.stats.skippedTests > 0) {
			this.lineWriter.writeLine(colors.skip(`${this.stats.skippedTests} ${plur('test', this.stats.skippedTests)} skipped`));
		}

		if (this.stats.todoTests > 0) {
			this.lineWriter.writeLine(colors.todo(`${this.stats.todoTests} ${plur('test', this.stats.todoTests)} todo`));
		}

		if (this.stats.unhandledRejections > 0) {
			this.lineWriter.writeLine(colors.error(`${this.stats.unhandledRejections} unhandled ${plur('rejection', this.stats.unhandledRejections)}`));
		}

		if (this.stats.uncaughtExceptions > 0) {
			this.lineWriter.writeLine(colors.error(`${this.stats.uncaughtExceptions} uncaught ${plur('exception', this.stats.uncaughtExceptions)}`));
		}

		if (this.previousFailures > 0) {
			this.lineWriter.writeLine(colors.error(`${this.previousFailures} previous ${plur('failure', this.previousFailures)} in test files that were not rerun`));
		}

		if (this.stats.passedKnownFailingTests > 0) {
			this.lineWriter.writeLine();
			for (const evt of this.knownFailures) {
				this.lineWriter.writeLine(colors.error(this.prefixTitle(evt.testFile, evt.title)));
			}
		}

		const shouldWriteFailFastDisclaimer = this.failFastEnabled && (this.stats.remainingTests > 0 || this.stats.files > this.stats.finishedWorkers);

		if (this.failures.length > 0) {
			this.lineWriter.writeLine();

			const lastFailure = this.failures[this.failures.length - 1];
			for (const evt of this.failures) {
				this.writeFailure(evt);
				if (evt !== lastFailure || shouldWriteFailFastDisclaimer) {
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
				}
			}
		}

		if (shouldWriteFailFastDisclaimer) {
			let remaining = '';
			if (this.stats.remainingTests > 0) {
				remaining += `At least ${this.stats.remainingTests} ${plur('test was', 'tests were', this.stats.remainingTests)} skipped`;
				if (this.stats.files > this.stats.finishedWorkers) {
					remaining += ', as well as ';
				}
			}

			if (this.stats.files > this.stats.finishedWorkers) {
				const skippedFileCount = this.stats.files - this.stats.finishedWorkers;
				remaining += `${skippedFileCount} ${plur('test file', 'test files', skippedFileCount)}`;
				if (this.stats.remainingTests === 0) {
					remaining += ` ${plur('was', 'were', skippedFileCount)} skipped`;
				}
			}

			this.lineWriter.writeLine(colors.information(`\`--fail-fast\` is on. ${remaining}.`));
		}

		this.lineWriter.writeLine();
	}
}

module.exports = VerboseReporter;
