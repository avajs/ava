'use strict';
const os = require('os');
const path = require('path');
const stream = require('stream');

const cliCursor = require('cli-cursor');
const figures = require('figures');
const indentString = require('indent-string');
const ora = require('ora');
const plur = require('plur');
const prettyMs = require('pretty-ms');
const trimOffNewlines = require('trim-off-newlines');

const chalk = require('../chalk').get();
const codeExcerpt = require('../code-excerpt');
const beautifyStack = require('./beautify-stack');
const colors = require('./colors');
const formatSerializedError = require('./format-serialized-error');
const improperUsageMessages = require('./improper-usage-messages');
const prefixTitle = require('./prefix-title');

const nodeInternals = require('stack-utils').nodeInternals();

class LineWriter extends stream.Writable {
	constructor(dest) {
		super();

		this.dest = dest;
		this.columns = dest.columns || 80;
		this.lastLineIsEmpty = false;
	}

	_write(chunk, _, callback) {
		this.dest.write(chunk);
		callback();
	}

	writeLine(string) {
		if (string) {
			this.write(indentString(string, 2) + os.EOL);
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

class LineWriterWithSpinner extends LineWriter {
	constructor(dest, spinner) {
		super(dest);

		this.lastSpinnerText = '';
		this.spinner = spinner;
	}

	_write(chunk, _, callback) {
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
		if (!this.spinner.isSpinning) {
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
}

function manageCorking(stream) {
	let corked = false;
	const cork = () => {
		corked = true;
		stream.cork();
	};

	const uncork = () => {
		corked = false;
		stream.uncork();
	};

	return {
		decorateFlushingWriter(fn) {
			return function (...args) {
				if (corked) {
					stream.uncork();
				}

				try {
					return fn.apply(this, args);
				} finally {
					if (corked) {
						stream.cork();
					}
				}
			};
		},

		decorateWriter(fn) {
			return function (...args) {
				cork();
				try {
					return fn.apply(this, args);
				} finally {
					uncork();
				}
			};
		}
	};
}

class Reporter {
	constructor({
		verbose,
		reportStream,
		stdStream,
		projectDir,
		watching,
		spinner,
		durationThreshold
	}) {
		this.verbose = verbose;
		this.reportStream = reportStream;
		this.stdStream = stdStream;
		this.watching = watching;
		this.relativeFile = file => path.relative(projectDir, file);

		const {decorateWriter, decorateFlushingWriter} = manageCorking(this.reportStream);
		this.consumeStateChange = decorateWriter(this.consumeStateChange);
		this.endRun = decorateWriter(this.endRun);

		if (this.verbose) {
			this.durationThreshold = durationThreshold || 100;
			this.spinner = null;
			this.clearSpinner = () => {};
			this.lineWriter = new LineWriter(this.reportStream);
		} else {
			this.spinner = ora({
				isEnabled: true,
				color: spinner ? spinner.color : 'gray',
				discardStdin: !watching,
				hideCursor: false,
				spinner: spinner || (process.platform === 'win32' ? 'line' : 'dots'),
				stream: reportStream
			});
			this.clearSpinner = decorateFlushingWriter(this.spinner.clear.bind(this.spinner));
			this.lineWriter = new LineWriterWithSpinner(this.reportStream, this.spinner);
		}

		this.reset();
	}

	reset() {
		if (this.removePreviousListener) {
			this.removePreviousListener();
		}

		this.prefixTitle = (testFile, title) => title;

		this.runningTestFiles = new Map();
		this.filesWithMissingAvaImports = new Set();
		this.filesWithoutDeclaredTests = new Set();
		this.filesWithoutMatchedLineNumbers = new Set();

		this.failures = [];
		this.internalErrors = [];
		this.knownFailures = [];
		this.lineNumberErrors = [];
		this.uncaughtExceptions = [];
		this.unhandledRejections = [];
		this.unsavedSnapshots = [];

		this.previousFailures = 0;

		this.failFastEnabled = false;
		this.lastLineIsEmpty = false;
		this.matching = false;

		this.removePreviousListener = null;
		this.stats = null;
	}

	startRun(plan) {
		if (plan.bailWithoutReporting) {
			return;
		}

		this.reset();

		this.failFastEnabled = plan.failFastEnabled;
		this.matching = plan.matching;
		this.previousFailures = plan.previousFailures;
		this.emptyParallelRun = plan.status.emptyParallelRun;

		if (this.watching || plan.files.length > 1) {
			this.prefixTitle = (testFile, title) => prefixTitle(plan.filePathPrefix, testFile, title);
		}

		this.removePreviousListener = plan.status.on('stateChange', evt => {
			this.consumeStateChange(evt);
		});

		if (this.watching && plan.runVector > 1) {
			this.lineWriter.write(chalk.gray.dim('\u2500'.repeat(this.lineWriter.columns)) + os.EOL);
		}

		if (this.spinner === null) {
			this.lineWriter.writeLine();
		} else {
			cliCursor.hide(this.reportStream);
			this.lineWriter.writeLine();
			this.spinner.start();
		}
	}

	consumeStateChange(event) { // eslint-disable-line complexity
		const fileStats = this.stats && event.testFile ? this.stats.byFile.get(event.testFile) : null;

		switch (event.type) { // eslint-disable-line default-case
			case 'hook-failed': {
				this.failures.push(event);
				this.writeTestSummary(event);
				break;
			}

			case 'stats': {
				this.stats = event.stats;
				break;
			}

			case 'test-failed': {
				this.failures.push(event);
				this.writeTestSummary(event);
				break;
			}

			case 'test-passed': {
				if (event.knownFailing) {
					this.knownFailures.push(event);
				}

				this.writeTestSummary(event);
				break;
			}

			case 'timeout': {
				this.lineWriter.writeLine(colors.error(`\n${figures.cross} Timed out while running tests`));
				this.lineWriter.writeLine('');
				this.writePendingTests(event);
				break;
			}

			case 'interrupt': {
				this.lineWriter.writeLine(colors.error(`\n${figures.cross} Exiting due to SIGINT`));
				this.lineWriter.writeLine('');
				this.writePendingTests(event);
				break;
			}

			case 'internal-error': {
				this.internalErrors.push(event);

				if (event.testFile) {
					this.write(colors.error(`${figures.cross} Internal error when running ${this.relativeFile(event.testFile)}`));
				} else {
					this.write(colors.error(`${figures.cross} Internal error`));
				}

				if (this.verbose) {
					this.lineWriter.writeLine(colors.stack(event.err.summary));
					this.lineWriter.writeLine(colors.errorStack(event.err.stack));
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
				}

				break;
			}

			case 'line-number-selection-error': {
				this.lineNumberErrors.push(event);

				this.write(colors.information(`${figures.warning} Could not parse ${this.relativeFile(event.testFile)} for line number selection`));
				break;
			}

			case 'missing-ava-import': {
				this.filesWithMissingAvaImports.add(event.testFile);

				this.write(colors.error(`${figures.cross} No tests found in ${this.relativeFile(event.testFile)}, make sure to import "ava" at the top of your test file`));
				break;
			}

			case 'hook-finished': {
				if (this.verbose && event.logs.length > 0) {
					this.lineWriter.writeLine(`  ${this.prefixTitle(event.testFile, event.title)}`);
					this.writeLogs(event);
				}

				break;
			}

			case 'selected-test': {
				if (this.verbose) {
					if (event.skip) {
						this.lineWriter.writeLine(colors.skip(`- ${this.prefixTitle(event.testFile, event.title)}`));
					} else if (event.todo) {
						this.lineWriter.writeLine(colors.todo(`- ${this.prefixTitle(event.testFile, event.title)}`));
					}
				}

				break;
			}

			case 'snapshot-error':
				this.unsavedSnapshots.push(event);
				break;

			case 'uncaught-exception': {
				this.uncaughtExceptions.push(event);

				if (this.verbose) {
					this.lineWriter.ensureEmptyLine();
					this.lineWriter.writeLine(colors.title(`Uncaught exception in ${this.relativeFile(event.testFile)}`));
					this.lineWriter.writeLine();
					this.writeErr(event);
				}

				break;
			}

			case 'unhandled-rejection': {
				this.unhandledRejections.push(event);

				if (this.verbose) {
					this.lineWriter.ensureEmptyLine();
					this.lineWriter.writeLine(colors.title(`Unhandled rejection in ${this.relativeFile(event.testFile)}`));
					this.lineWriter.writeLine();
					this.writeErr(event);
				}

				break;
			}

			case 'worker-failed': {
				if (fileStats.declaredTests === 0) {
					this.filesWithoutDeclaredTests.add(event.testFile);
				}

				if (this.verbose && !this.filesWithMissingAvaImports.has(event.testFile)) {
					if (event.nonZeroExitCode) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} ${this.relativeFile(event.testFile)} exited with a non-zero exit code: ${event.nonZeroExitCode}`));
					} else {
						this.lineWriter.writeLine(colors.error(`${figures.cross} ${this.relativeFile(event.testFile)} exited due to ${event.signal}`));
					}
				}

				break;
			}

			case 'worker-finished': {
				if (!event.forcedExit && !this.filesWithMissingAvaImports.has(event.testFile)) {
					if (fileStats.declaredTests === 0) {
						this.filesWithoutDeclaredTests.add(event.testFile);

						this.write(colors.error(`${figures.cross} No tests found in ${this.relativeFile(event.testFile)}`));
					} else if (fileStats.selectingLines && fileStats.selectedTests === 0) {
						this.filesWithoutMatchedLineNumbers.add(event.testFile);

						this.lineWriter.writeLine(colors.error(`${figures.cross} Line numbers for ${this.relativeFile(event.testFile)} did not match any tests`));
					} else if (this.verbose && !this.failFastEnabled && fileStats.remainingTests > 0) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} ${fileStats.remainingTests} ${plur('test', fileStats.remainingTests)} remaining in ${this.relativeFile(event.testFile)}`));
					}
				}

				break;
			}

			case 'worker-stderr': {
				// Forcibly clear the spinner, writing the chunk corrupts the TTY.
				this.clearSpinner();

				this.stdStream.write(event.chunk);
				// If the chunk does not end with a linebreak, *forcibly* write one to
				// ensure it remains visible in the TTY.
				// Tests cannot assume their standard output is not interrupted. Indeed
				// we multiplex stdout and stderr into a single stream. However as
				// long as stdStream is different from reportStream users can read
				// their original output by redirecting the streams.
				if (event.chunk[event.chunk.length - 1] !== 0x0A) {
					this.reportStream.write(os.EOL);
				}

				if (this.spinner !== null)	{
					this.lineWriter.write(this.lineWriter.lastSpinnerText);
				}

				break;
			}

			case 'worker-stdout': {
				// Forcibly clear the spinner, writing the chunk corrupts the TTY.
				this.clearSpinner();

				this.stdStream.write(event.chunk);
				// If the chunk does not end with a linebreak, *forcibly* write one to
				// ensure it remains visible in the TTY.
				// Tests cannot assume their standard output is not interrupted. Indeed
				// we multiplex stdout and stderr into a single stream. However as
				// long as stdStream is different from reportStream users can read
				// their original output by redirecting the streams.
				if (event.chunk[event.chunk.length - 1] !== 0x0A) {
					this.reportStream.write(os.EOL);
				}

				if (this.spinner !== null) {
					this.lineWriter.write(this.lineWriter.lastSpinnerText);
				}
			}
		}
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

	write(string) {
		if (this.verbose) {
			this.lineWriter.writeLine(string);
		} else {
			this.writeWithCounts(string);
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

		let firstLinePostfix = this.watching ? ' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']') : '';

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

	writeErr(event) {
		if (event.err.name === 'TSError' && event.err.object && event.err.object.diagnosticText) {
			this.lineWriter.writeLine(colors.errorStack(trimOffNewlines(event.err.object.diagnosticText)));
			this.lineWriter.writeLine();
			return;
		}

		if (event.err.source) {
			this.lineWriter.writeLine(colors.errorSource(`${this.relativeFile(event.err.source.file)}:${event.err.source.line}`));
			const excerpt = codeExcerpt(event.err.source, {maxWidth: this.reportStream.columns - 2});
			if (excerpt) {
				this.lineWriter.writeLine();
				this.lineWriter.writeLine(excerpt);
				this.lineWriter.writeLine();
			}
		}

		if (event.err.avaAssertionError) {
			const result = formatSerializedError(event.err);
			if (result.printMessage) {
				this.lineWriter.writeLine(event.err.message);
				this.lineWriter.writeLine();
			}

			if (result.formatted) {
				this.lineWriter.writeLine(result.formatted);
				this.lineWriter.writeLine();
			}

			const message = improperUsageMessages.forError(event.err);
			if (message) {
				this.lineWriter.writeLine(message);
				this.lineWriter.writeLine();
			}
		} else if (event.err.nonErrorObject) {
			this.lineWriter.writeLine(trimOffNewlines(event.err.formatted));
			this.lineWriter.writeLine();
		} else {
			this.lineWriter.writeLine(event.err.summary);
			this.lineWriter.writeLine();
		}

		const formatted = this.formatErrorStack(event.err);
		if (formatted.length > 0) {
			this.lineWriter.writeLine(formatted.join('\n'));
			this.lineWriter.writeLine();
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

	writeLogs(event, surroundLines) {
		if (event.logs && event.logs.length > 0) {
			if (surroundLines) {
				this.lineWriter.writeLine();
			}

			for (const log of event.logs) {
				const logLines = indentString(colors.log(log), 4);
				const logLinesWithLeadingFigure = logLines.replace(/^ {4}/, `  ${colors.information(figures.info)} `);
				this.lineWriter.writeLine(logLinesWithLeadingFigure);
			}

			if (surroundLines) {
				this.lineWriter.writeLine();
			}

			return true;
		}

		return false;
	}

	writeTestSummary(event) {
		if (event.type === 'hook-failed' || event.type === 'test-failed') {
			if (this.verbose) {
				this.write(`${colors.error(figures.cross)} ${this.prefixTitle(event.testFile, event.title)} ${colors.error(event.err.message)}`);
			} else {
				this.write(this.prefixTitle(event.testFile, event.title));
			}
		} else if (event.knownFailing) {
			if (this.verbose) {
				this.write(`${colors.error(figures.tick)} ${colors.error(this.prefixTitle(event.testFile, event.title))}`);
			} else {
				this.write(colors.error(this.prefixTitle(event.testFile, event.title)));
			}
		} else if (this.verbose) {
			const duration = event.duration > this.durationThreshold ? colors.duration(' (' + prettyMs(event.duration) + ')') : '';
			this.write(`${colors.pass(figures.tick)} ${this.prefixTitle(event.testFile, event.title)}${duration}`);
		} else {
			this.write(this.prefixTitle(event.testFile, event.title));
		}

		if (this.verbose) {
			this.writeLogs(event);
		}
	}

	writeFailure(event) {
		this.lineWriter.writeLine(colors.title(this.prefixTitle(event.testFile, event.title)));
		if (!this.writeLogs(event, true)) {
			this.lineWriter.writeLine();
		}

		this.writeErr(event);
	}

	endRun() {// eslint-disable-line complexity
		let firstLinePostfix = this.watching ? ` ${chalk.gray.dim(`[${new Date().toLocaleTimeString('en-US', {hour12: false})}]`)}` : '';
		let wroteSomething = false;

		if (!this.verbose) {
			this.spinner.stop();
			cliCursor.show(this.reportStream);
		} else if (this.emptyParallelRun) {
			this.lineWriter.writeLine('No files tested in this parallel run');
			this.lineWriter.writeLine();
			return;
		}

		if (!this.stats) {
			this.lineWriter.writeLine(colors.error(`${figures.cross} Couldn’t find any files to test` + firstLinePostfix));
			this.lineWriter.writeLine();
			return;
		}

		if (this.matching && this.stats.selectedTests === 0) {
			this.lineWriter.writeLine(colors.error(`${figures.cross} Couldn’t find any matching tests` + firstLinePostfix));
			this.lineWriter.writeLine();
			return;
		}

		if (this.verbose) {
			this.lineWriter.writeLine(colors.log(figures.line));
			this.lineWriter.writeLine();
		} else {
			if (this.filesWithMissingAvaImports.size > 0) {
				for (const testFile of this.filesWithMissingAvaImports) {
					this.lineWriter.writeLine(colors.error(`${figures.cross} No tests found in ${this.relativeFile(testFile)}, make sure to import "ava" at the top of your test file`) + firstLinePostfix);
					firstLinePostfix = '';
					wroteSomething = true;
				}
			}

			if (this.filesWithoutDeclaredTests.size > 0) {
				for (const testFile of this.filesWithoutDeclaredTests) {
					if (!this.filesWithMissingAvaImports.has(testFile)) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} No tests found in ${this.relativeFile(testFile)}`) + firstLinePostfix);
						firstLinePostfix = '';
						wroteSomething = true;
					}
				}
			}

			if (this.lineNumberErrors.length > 0) {
				for (const event of this.lineNumberErrors) {
					this.lineWriter.writeLine(colors.information(`${figures.warning} Could not parse ${this.relativeFile(event.testFile)} for line number selection` + firstLinePostfix));
					firstLinePostfix = '';
					wroteSomething = true;
				}
			}

			if (this.filesWithoutMatchedLineNumbers.size > 0) {
				for (const testFile of this.filesWithoutMatchedLineNumbers) {
					if (!this.filesWithMissingAvaImports.has(testFile) && !this.filesWithoutDeclaredTests.has(testFile)) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} Line numbers for ${this.relativeFile(testFile)} did not match any tests`) + firstLinePostfix);
						firstLinePostfix = '';
						wroteSomething = true;
					}
				}
			}

			if (wroteSomething) {
				this.lineWriter.writeLine();
				this.lineWriter.writeLine(colors.log(figures.line));
				this.lineWriter.writeLine();
				wroteSomething = false;
			}
		}

		if (this.failures.length > 0) {
			const writeTrailingLines = this.internalErrors.length > 0 || this.uncaughtExceptions.length > 0 || this.unhandledRejections.length > 0;

			const lastFailure = this.failures[this.failures.length - 1];
			for (const event of this.failures) {
				this.writeFailure(event);
				if (event !== lastFailure) {
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
				} else if (!this.verbose && writeTrailingLines) {
					this.lineWriter.writeLine();
					this.lineWriter.writeLine();
				}

				wroteSomething = true;
			}

			if (this.verbose) {
				this.lineWriter.writeLine(colors.log(figures.line));
				this.lineWriter.writeLine();
			}
		}

		if (!this.verbose) {
			if (this.internalErrors.length > 0) {
				const writeTrailingLines = this.uncaughtExceptions.length > 0 || this.unhandledRejections.length > 0;

				const last = this.internalErrors[this.internalErrors.length - 1];
				for (const event of this.internalErrors) {
					if (event.testFile) {
						this.lineWriter.writeLine(colors.error(`${figures.cross} Internal error when running ${this.relativeFile(event.testFile)}`));
					} else {
						this.lineWriter.writeLine(colors.error(`${figures.cross} Internal error`));
					}

					this.lineWriter.writeLine(colors.stack(event.err.summary));
					this.lineWriter.writeLine(colors.errorStack(event.err.stack));
					if (event !== last || writeTrailingLines) {
						this.lineWriter.writeLine();
						this.lineWriter.writeLine();
						this.lineWriter.writeLine();
					}

					wroteSomething = true;
				}
			}

			if (this.uncaughtExceptions.length > 0) {
				const writeTrailingLines = this.unhandledRejections.length > 0;

				const last = this.uncaughtExceptions[this.uncaughtExceptions.length - 1];
				for (const event of this.uncaughtExceptions) {
					this.lineWriter.writeLine(colors.title(`Uncaught exception in ${this.relativeFile(event.testFile)}`));
					this.lineWriter.writeLine();
					this.writeErr(event);
					if (event !== last || writeTrailingLines) {
						this.lineWriter.writeLine();
						this.lineWriter.writeLine();
					}

					wroteSomething = true;
				}
			}

			if (this.unhandledRejections.length > 0) {
				const last = this.unhandledRejections[this.unhandledRejections.length - 1];
				for (const event of this.unhandledRejections) {
					this.lineWriter.writeLine(colors.title(`Unhandled rejection in ${this.relativeFile(event.testFile)}`));
					this.lineWriter.writeLine();
					this.writeErr(event);
					if (event !== last) {
						this.lineWriter.writeLine();
						this.lineWriter.writeLine();
					}

					wroteSomething = true;
				}
			}

			if (wroteSomething) {
				this.lineWriter.writeLine(colors.log(figures.line));
				this.lineWriter.writeLine();
			}
		}

		if (this.unsavedSnapshots.length > 0) {
			this.lineWriter.writeLine(colors.title('Could not update snapshots for the following test files:'));
			this.lineWriter.writeLine();
			for (const event of this.unsavedSnapshots) {
				this.lineWriter.writeLine(`${figures.warning} ${this.relativeFile(event.testFile)}`);
			}

			this.lineWriter.writeLine();
		}

		if (this.failFastEnabled && (this.stats.remainingTests > 0 || this.stats.files > this.stats.finishedWorkers)) {
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
			if (this.verbose) {
				this.lineWriter.writeLine();
			}
		}

		if (this.verbose && this.stats.parallelRuns) {
			const {
				currentFileCount,
				currentIndex,
				totalRuns
			} = this.stats.parallelRuns;
			this.lineWriter.writeLine(colors.information(`Ran ${currentFileCount} test ${plur('file', currentFileCount)} out of ${this.stats.files} for job ${currentIndex + 1} of ${totalRuns}`));
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

		if (
			this.stats.failedHooks === 0 &&
			this.stats.failedTests === 0 &&
			this.stats.passedTests > 0
		) {
			this.lineWriter.writeLine(colors.pass(`${this.stats.passedTests} ${plur('test', this.stats.passedTests)} passed`) + firstLinePostfix
			);
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

		if (this.watching) {
			this.lineWriter.writeLine();
		}
	}
}
module.exports = Reporter;
