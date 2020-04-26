'use strict';
const os = require('os');
const path = require('path');
const stream = require('stream');

const cliCursor = require('cli-cursor');
const figures = require('figures');
const indentString = require('indent-string');
const ora = require('ora');
const plur = require('plur');
const trimOffNewlines = require('trim-off-newlines');
const beautifyStack = require('./beautify-stack');

const chalk = require('../chalk').get();
const codeExcerpt = require('../code-excerpt');
const colors = require('./colors');
const formatSerializedError = require('./format-serialized-error');
const improperUsageMessages = require('./improper-usage-messages');
const prefixTitle = require('./prefix-title');
const whileCorked = require('./while-corked');

const nodeInternals = require('stack-utils').nodeInternals();

class LineWriter extends stream.Writable {
	constructor(dest, spinner) {
		super();

		this.dest = dest;
		this.columns = dest.columns || 80;
		this.spinner = spinner;
		this.lastSpinnerText = '';
	}

	_write(chunk, encoding, callback) {
		// Discard the current spinner output. Any lines that were meant to be
		// preserved should be rewritten.
		this.spinner.clear();

		this._writeWithSpinner(chunk.toString('utf8'));
		callback();
	}

	_writev(pieces, callback) {
		// Discard the current spinner output. Any lines that were meant to be
		// preserved should be rewritten.
		this.spinner.clear();

		const last = pieces.pop();
		for (const piece of pieces) {
			this.dest.write(piece.chunk);
		}

		this._writeWithSpinner(last.chunk.toString('utf8'));
		callback();
	}

	_writeWithSpinner(string) {
		if (!this.spinner.id) {
			this.dest.write(string);
			return;
		}

		this.lastSpinnerText = string;
		// Ignore whitespace at the end of the chunk. We're continiously rewriting
		// the last line through the spinner. Also be careful to remove the indent
		// as the spinner adds its own.
		this.spinner.text = string.trimEnd().slice(2);
		this.spinner.render();
	}

	writeLine(string) {
		if (string) {
			this.write(indentString(string, 2) + os.EOL);
		} else {
			this.write(os.EOL);
		}
	}
}

class MiniReporter {
	constructor(options) {
		this.reportStream = options.reportStream;
		this.stdStream = options.stdStream;
		this.watching = options.watching;

		this.spinner = ora({
			isEnabled: true,
			color: options.spinner ? options.spinner.color : 'gray',
			discardStdin: !options.watching,
			hideCursor: false,
			spinner: options.spinner || (process.platform === 'win32' ? 'line' : 'dots'),
			stream: options.reportStream
		});
		this.lineWriter = new LineWriter(this.reportStream, this.spinner);

		this.consumeStateChange = whileCorked(this.reportStream, whileCorked(this.lineWriter, this.consumeStateChange));
		this.endRun = whileCorked(this.reportStream, whileCorked(this.lineWriter, this.endRun));
		this.relativeFile = file => path.relative(options.projectDir, file);

		this.reset();
	}

	reset() {
		if (this.removePreviousListener) {
			this.removePreviousListener();
		}

		this.failFastEnabled = false;
		this.failures = [];
		this.filesWithMissingAvaImports = new Set();
		this.filesWithoutDeclaredTests = new Set();
		this.filesWithoutMatchedLineNumbers = new Set();
		this.internalErrors = [];
		this.knownFailures = [];
		this.lineNumberErrors = [];
		this.matching = false;
		this.prefixTitle = (testFile, title) => title;
		this.previousFailures = 0;
		this.removePreviousListener = null;
		this.stats = null;
		this.uncaughtExceptions = [];
		this.unhandledRejections = [];
	}

	startRun(plan) {
		if (plan.bailWithoutReporting) {
			return;
		}

		this.reset();

		this.failFastEnabled = plan.failFastEnabled;
		this.matching = plan.matching;
		this.previousFailures = plan.previousFailures;

		if (this.watching || plan.files.length > 1) {
			this.prefixTitle = (testFile, title) => prefixTitle(plan.filePathPrefix, testFile, title);
		}

		this.removePreviousListener = plan.status.on('stateChange', evt => this.consumeStateChange(evt));

		if (this.watching && plan.runVector > 1) {
			this.reportStream.write(chalk.gray.dim('\u2500'.repeat(this.lineWriter.columns)) + os.EOL);
		}

		cliCursor.hide(this.reportStream);
		this.lineWriter.writeLine();

		this.spinner.start();
	}

	consumeStateChange(evt) { // eslint-disable-line complexity
		const fileStats = this.stats && evt.testFile ? this.stats.byFile.get(evt.testFile) : null;

		switch (evt.type) {
			case 'declared-test':
				// Ignore
				break;
			case 'hook-failed':
				this.failures.push(evt);
				this.writeTestSummary(evt);
				break;
			case 'internal-error':
				this.internalErrors.push(evt);
				if (evt.testFile) {
					this.writeWithCounts(colors.error(`${figures.cross} Internal error when running ${this.relativeFile(evt.testFile)}`));
				} else {
					this.writeWithCounts(colors.error(`${figures.cross} Internal error`));
				}

				break;
			case 'line-number-selection-error':
				this.lineNumberErrors.push(evt);
				this.writeWithCounts(colors.information(`${figures.warning} Could not parse ${this.relativeFile(evt.testFile)} for line number selection`));
				break;
			case 'missing-ava-import':
				this.filesWithMissingAvaImports.add(evt.testFile);
				this.writeWithCounts(colors.error(`${figures.cross} No tests found in ${this.relativeFile(evt.testFile)}, make sure to import "ava" at the top of your test file`));
				break;
			case 'selected-test':
				// Ignore
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
				this.uncaughtExceptions.push(evt);
				break;
			case 'unhandled-rejection':
				this.unhandledRejections.push(evt);
				break;
			case 'worker-failed':
				if (fileStats.declaredTests === 0) {
					this.filesWithoutDeclaredTests.add(evt.testFile);
				}

				break;
			case 'worker-finished':
				if (fileStats.declaredTests === 0) {
					this.filesWithoutDeclaredTests.add(evt.testFile);
					this.writeWithCounts(colors.error(`${figures.cross} No tests found in ${this.relativeFile(evt.testFile)}`));
				} else if (fileStats.selectingLines && fileStats.selectedTests === 0) {
					this.filesWithoutMatchedLineNumbers.add(evt.testFile);
					this.writeWithCounts(colors.error(`${figures.cross} Line numbers for ${this.relativeFile(evt.testFile)} did not match any tests`));
				}

				break;
			case 'worker-stderr':
			case 'worker-stdout':
				// Forcibly clear the spinner, writing the chunk corrupts the TTY.
				this.spinner.clear();

				this.stdStream.write(evt.chunk);
				// If the chunk does not end with a linebreak, *forcibly* write one to
				// ensure it remains visible in the TTY.
				// Tests cannot assume their standard output is not interrupted. Indeed
				// we multiplex stdout and stderr into a single stream. However as
				// long as stdStream is different from reportStream users can read
				// their original output by redirecting the streams.
				if (evt.chunk[evt.chunk.length - 1] !== 0x0A) {
					// Use write() rather than writeLine() so the (presumably corked)
					// line writer will actually write the empty line before re-rendering
					// the last spinner text below.
					this.lineWriter.write(os.EOL);
				}

				this.lineWriter.write(this.lineWriter.lastSpinnerText);
				break;
			default:
				break;
		}
	}

	writeWithCounts(string) {
		if (!this.stats) {
			return this.lineWriter.writeLine(string);
		}

		string = string || '';
		if (string !== '') {
			string += os.EOL;
		}

		let firstLinePostfix = this.watching ?
			' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']') :
			'';

		if (this.stats.passedTests > 0) {
			string += os.EOL + colors.pass(`${this.stats.passedTests} passed`) + firstLinePostfix;
			firstLinePostfix = '';
		}

		if (this.stats.passedKnownFailingTests > 0) {
			string += os.EOL + colors.error(`${this.stats.passedKnownFailingTests} ${plur('known failure', this.stats.passedKnownFailingTests)}`);
		}

		if (this.stats.failedHooks > 0) {
			string += os.EOL + colors.error(`${this.stats.failedHooks} ${plur('hook', this.stats.failedHooks)} failed`) + firstLinePostfix;
			firstLinePostfix = '';
		}

		if (this.stats.failedTests > 0) {
			string += os.EOL + colors.error(`${this.stats.failedTests} ${plur('test', this.stats.failedTests)} failed`) + firstLinePostfix;
			firstLinePostfix = '';
		}

		if (this.stats.skippedTests > 0) {
			string += os.EOL + colors.skip(`${this.stats.skippedTests} skipped`);
		}

		if (this.stats.todoTests > 0) {
			string += os.EOL + colors.todo(`${this.stats.todoTests} todo`);
		}

		this.lineWriter.writeLine(string);
	}

	writeErr(evt) {
		if (evt.err.name === 'TSError' && evt.err.object && evt.err.object.diagnosticText) {
			this.lineWriter.writeLine(colors.errorStack(trimOffNewlines(evt.err.object.diagnosticText)));
			return;
		}

		if (evt.err.source) {
			this.lineWriter.writeLine(colors.errorSource(`${this.relativeFile(evt.err.source.file)}:${evt.err.source.line}`));
			const excerpt = codeExcerpt(evt.err.source, {maxWidth: this.lineWriter.columns - 2});
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

		const formatted = this.formatErrorStack(evt.err);
		if (formatted.length > 0) {
			this.lineWriter.writeLine();
			this.lineWriter.writeLine(formatted.join('\n'));
		}
	}

	formatErrorStack(error) {
		if (!error.stack) {
			return [];
		}

		if (error.shouldBeautifyStack) {
			return beautifyStack(error.stack).map(line => {
				if (nodeInternals.some(internal => internal.test(line))) {
					return colors.errorStackInternal(`${figures.pointerSmall} ${line}`);
				}

				return colors.errorStack(`${figures.pointerSmall} ${line}`);
			});
		}

		return [error.stack];
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
			this.writeWithCounts(`${this.prefixTitle(evt.testFile, evt.title)}`);
		} else if (evt.knownFailing) {
			this.writeWithCounts(`${colors.error(this.prefixTitle(evt.testFile, evt.title))}`);
		} else {
			this.writeWithCounts(`${this.prefixTitle(evt.testFile, evt.title)}`);
		}
	}

	writeFailure(evt) {
		this.lineWriter.writeLine(`${colors.title(this.prefixTitle(evt.testFile, evt.title))}`);
		this.writeLogs(evt);
		this.lineWriter.writeLine();
		this.writeErr(evt);
	}

	writePendingTests(evt) {
		for (const [file, testsInFile] of evt.pendingTests) {
			if (testsInFile.size === 0) {
				continue;
			}

			this.lineWriter.writeLine(`${testsInFile.size} tests were pending in ${this.relativeFile(file)}\n`);
			for (const title of testsInFile) {
				this.lineWriter.writeLine(`${figures.circleDotted} ${this.prefixTitle(file, title)}`);
			}

			this.lineWriter.writeLine('');
		}
	}

	endRun() { // eslint-disable-line complexity
		this.spinner.stop();
		cliCursor.show(this.reportStream);

		if (!this.stats) {
			this.lineWriter.writeLine(colors.error(`${figures.cross} Couldn’t find any files to test`));
			this.lineWriter.writeLine();
			return;
		}

		if (this.matching && this.stats.selectedTests === 0) {
			this.lineWriter.writeLine(colors.error(`${figures.cross} Couldn’t find any matching tests`));
			this.lineWriter.writeLine();
			return;
		}

		this.lineWriter.writeLine();

		let firstLinePostfix = this.watching ?
			' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']') :
			'';

		if (this.filesWithMissingAvaImports.size > 0) {
			for (const testFile of this.filesWithMissingAvaImports) {
				this.lineWriter.writeLine(colors.error(`${figures.cross} No tests found in ${this.relativeFile(testFile)}, make sure to import "ava" at the top of your test file`) + firstLinePostfix);
				firstLinePostfix = '';
			}
		}

		if (this.filesWithoutDeclaredTests.size > 0) {
			for (const testFile of this.filesWithoutDeclaredTests) {
				if (!this.filesWithMissingAvaImports.has(testFile)) {
					this.lineWriter.writeLine(colors.error(`${figures.cross} No tests found in ${this.relativeFile(testFile)}`) + firstLinePostfix);
					firstLinePostfix = '';
				}
			}
		}

		if (this.lineNumberErrors.length > 0) {
			for (const evt of this.lineNumberErrors) {
				this.lineWriter.writeLine(colors.information(`${figures.warning} Could not parse ${this.relativeFile(evt.testFile)} for line number selection`));
			}
		}

		if (this.filesWithoutMatchedLineNumbers.size > 0) {
			for (const testFile of this.filesWithoutMatchedLineNumbers) {
				if (!this.filesWithMissingAvaImports.has(testFile) && !this.filesWithoutDeclaredTests.has(testFile)) {
					this.lineWriter.writeLine(colors.error(`${figures.cross} Line numbers for ${this.relativeFile(testFile)} did not match any tests`) + firstLinePostfix);
					firstLinePostfix = '';
				}
			}
		}

		if (this.filesWithMissingAvaImports.size > 0 || this.filesWithoutDeclaredTests.size > 0 || this.filesWithoutMatchedLineNumbers.size > 0) {
			this.lineWriter.writeLine();
		}

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
			const writeTrailingLines = shouldWriteFailFastDisclaimer || this.internalErrors.length > 0 || this.uncaughtExceptions.length > 0 || this.unhandledRejections.length > 0;
			this.lineWriter.writeLine();

			const last = this.failures[this.failures.length - 1];
			for (const evt of this.failures) {
				this.writeFailure(evt);
				if (evt !== last || writeTrailingLines) {
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
				}
			}
		}

		if (this.internalErrors.length > 0) {
			const writeLeadingLine = this.failures.length === 0;
			const writeTrailingLines = shouldWriteFailFastDisclaimer || this.uncaughtExceptions.length > 0 || this.unhandledRejections.length > 0;

			if (writeLeadingLine) {
				this.lineWriter.writeLine();
			}

			const last = this.internalErrors[this.internalErrors.length - 1];
			for (const evt of this.internalErrors) {
				if (evt.testFile) {
					this.lineWriter.writeLine(colors.error(`${figures.cross} Internal error when running ${this.relativeFile(evt.testFile)}`));
				} else {
					this.lineWriter.writeLine(colors.error(`${figures.cross} Internal error`));
				}

				this.lineWriter.writeLine(colors.stack(evt.err.summary));
				this.lineWriter.writeLine(colors.errorStack(evt.err.stack));
				if (evt !== last || writeTrailingLines) {
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
				}
			}
		}

		if (this.uncaughtExceptions.length > 0) {
			const writeLeadingLine = this.failures.length === 0 && this.internalErrors.length === 0;
			const writeTrailingLines = shouldWriteFailFastDisclaimer || this.unhandledRejections.length > 0;

			if (writeLeadingLine) {
				this.lineWriter.writeLine();
			}

			const last = this.uncaughtExceptions[this.uncaughtExceptions.length - 1];
			for (const evt of this.uncaughtExceptions) {
				this.lineWriter.writeLine(colors.title(`Uncaught exception in ${this.relativeFile(evt.testFile)}`));
				this.lineWriter.writeLine();
				this.writeErr(evt);
				if (evt !== last || writeTrailingLines) {
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
				}
			}
		}

		if (this.unhandledRejections.length > 0) {
			const writeLeadingLine = this.failures.length === 0 && this.internalErrors.length === 0 && this.uncaughtExceptions.length === 0;
			const writeTrailingLines = shouldWriteFailFastDisclaimer;

			if (writeLeadingLine) {
				this.lineWriter.writeLine();
			}

			const last = this.unhandledRejections[this.unhandledRejections.length - 1];
			for (const evt of this.unhandledRejections) {
				this.lineWriter.writeLine(colors.title(`Unhandled rejection in ${this.relativeFile(evt.testFile)}`));
				this.lineWriter.writeLine();
				this.writeErr(evt);
				if (evt !== last || writeTrailingLines) {
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
module.exports = MiniReporter;
