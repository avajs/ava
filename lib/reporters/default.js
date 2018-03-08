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
const trimRight = require('trim-right');

const chalk = require('../chalk').get();
const codeExcerpt = require('../code-excerpt');
const colors = require('./colors');
const formatSerializedError = require('./format-serialized-error');
const improperUsageMessages = require('./improper-usage-messages');
const prefixTitle = require('./prefix-title');
const whileCorked = require('./while-corked');

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
		if (this.spinner) {
			this.spinner.clear();
		}

		this._writeWithSpinner(chunk);
		callback();
	}

	_writev(pieces, callback) {
		// Discard the current spinner output. Any lines that were meant to be
		// preserved should be rewritten.
		if (this.spinner) {
			this.spinner.clear();
		}

		const last = pieces.pop();
		for (const piece of pieces) {
			this.dest.write(piece.chunk);
		}
		this._writeWithSpinner(last.chunk);
		callback();
	}

	_writeWithSpinner(chunk) {
		if (!this.spinner || !this.spinner.id) {
			this.dest.write(chunk);
			return;
		}

		const str = chunk.toString('utf8');
		this.lastSpinnerText = str;
		// Ignore whitespace at the end of the chunk. We're continiously rewriting
		// the last line through the spinner. Also be careful to remove the indent
		// as the spinner adds its own.
		this.spinner.text = trimRight(str).slice(2);
		this.spinner.render();
	}

	writeLine(str) {
		if (str) {
			this.write(indentString(str, 2) + os.EOL);
		} else {
			this.write(os.EOL);
		}
	}
}

class DefaultReporter {
	constructor(options) {
		this.hideCursor = options.hideCursor === true;
		this.rewriteLines = options.rewriteLines === true;
		this.reportStream = options.reportStream;
		this.stdStream = options.stdStream;
		this.verbose = options.verbose === true;
		this.watching = options.watching;

		this.spinner = this.rewriteLines ?
			ora({
				enabled: true,
				color: options.spinner ? options.spinner.color : 'gray',
				hideCursor: false,
				spinner: options.spinner || (process.platform === 'win32' ? 'line' : 'dots'),
				stream: options.reportStream
			}) : null;
		this.lineWriter = new LineWriter(this.reportStream, this.spinner);

		this.consumeStateChange = whileCorked(this.reportStream, whileCorked(this.lineWriter, this.consumeStateChange));
		this.endRun = whileCorked(this.reportStream, whileCorked(this.lineWriter, this.endRun));

		this.reset();
	}

	reset() {
		if (this.removePreviousListener) {
			this.removePreviousListener();
		}

		this.failFastEnabled = false;
		this.matching = false;
		this.prefixTitle = (testFile, title) => title;
		this.previousFailures = 0;

		this.latestStats = null;
		this.stateChangesByFile = new Map();
		this.timedOut = null;
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
			this.reportStream.write(chalk.gray.dim('\u2500'.repeat(this.lineWriter.columns)) + os.EOL);
		}

		if (this.hideCursor) {
			cliCursor.hide(this.reportStream);
		}
		this.lineWriter.writeLine();
		if (this.spinner) {
			this.spinner.start();
		}
	}

	consumeStateChange(evt) { // eslint-disable-line complexity
		if (evt.testFile && !this.stateChangesByFile.has(evt.testFile)) {
			this.stateChangesByFile.set(evt.testFile, []);
		}
		const changesByFile = this.stateChangesByFile.get(evt.testFile);

		switch (evt) {
			case 'declared-test':
				// Ignore
				break;

			case 'stats': {
				this.latestStats = evt.stats;
				break;
			}

			case 'internal-error':
			case 'missing-ava-import':
			case 'selected-test':
			case 'uncaught-exception':
			case 'unhandled-rejection': {
				changesByFile.push(evt);
				break;
			}

			case 'hook-failed':
			case 'test-failed':
			case 'test-passed': {
				changesByFile.push(evt);
				this.writeTrailer(this.summarizeTest(evt));
				break;
			}

			case 'worker-failed':
			case 'worker-finished': {
				this.writeWorkerResult(evt);
				break;
			}

			case 'timeout': {
				this.timedOut = evt;
				this.writeTrailer(colors.error(`${figures.cross} Exited because no new tests completed within the last ${evt.period}ms of inactivity`));
				break;
			}

			case 'worker-stderr':
			case 'worker-stdout': {
				// Forcibly clear the spinner, writing the chunk corrupts the TTY.
				if (this.spinner) {
					this.spinner.clear();
				}

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

				if (this.spinner) {
					this.lineWriter.write(this.lineWriter.lastSpinnerText);
				}

				break;
			}

			default:
				break;
		}
	}

	endRun() {
		if (this.spinner) {
			this.spinner.stop();
		}
		if (this.hideCursor) {
			cliCursor.show(this.reportStream);
		}

		// Write timedOut message
		// Write final stats
	}

	summarizeTest(evt) {

	}

	writeTrailer(str) {
		if (!this.rewriteLines) {
			return;
		}
	}

	writeWorkerResult(exitEvt) {

	}
}
module.exports = DefaultReporter;
