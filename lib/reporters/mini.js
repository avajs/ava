'use strict';
const StringDecoder = require('string_decoder').StringDecoder;
const cliCursor = require('cli-cursor');
const lastLineTracker = require('last-line-stream/tracker');
const plur = require('plur');
const spinners = require('cli-spinners');
const chalk = require('chalk');
const figures = require('figures');
const cliTruncate = require('cli-truncate');
const cross = require('figures').cross;
const indentString = require('indent-string');
const ansiEscapes = require('ansi-escapes');
const trimOffNewlines = require('trim-off-newlines');
const codeExcerpt = require('../code-excerpt');
const colors = require('../colors');
const formatSerializedError = require('./format-serialized-error');
const improperUsageMessages = require('./improper-usage-messages');

class MiniReporter {
	constructor(options) {
		this.options = Object.assign({}, options);

		chalk.enabled = this.options.color;
		for (const key of Object.keys(colors)) {
			colors[key].enabled = this.options.color;
		}

		const spinnerDef = spinners[process.platform === 'win32' ? 'line' : 'dots'];
		this.spinnerFrames = spinnerDef.frames.map(c => chalk.gray.dim(c));
		this.spinnerInterval = spinnerDef.interval;

		this.reset();
		this.stream = process.stderr;
		this.stringDecoder = new StringDecoder();
	}
	start() {
		this.interval = setInterval(() => {
			this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
			this.write(this.prefix());
		}, this.spinnerInterval);

		return this.prefix('');
	}
	reset() {
		this.clearInterval();
		this.passCount = 0;
		this.knownFailureCount = 0;
		this.failCount = 0;
		this.skipCount = 0;
		this.todoCount = 0;
		this.rejectionCount = 0;
		this.exceptionCount = 0;
		this.currentStatus = '';
		this.currentTest = '';
		this.statusLineCount = 0;
		this.spinnerIndex = 0;
		this.lastLineTracker = lastLineTracker();
	}
	spinnerChar() {
		return this.spinnerFrames[this.spinnerIndex];
	}
	clearInterval() {
		clearInterval(this.interval);
		this.interval = null;
	}
	test(test) {
		if (test.todo) {
			this.todoCount++;
		} else if (test.skip) {
			this.skipCount++;
		} else if (test.error) {
			this.failCount++;
		} else {
			this.passCount++;
			if (test.failing) {
				this.knownFailureCount++;
			}
		}

		if (test.todo || test.skip) {
			return;
		}

		return this.prefix(this._test(test));
	}
	prefix(str) {
		str = str || this.currentTest;
		this.currentTest = str;

		// The space before the newline is required for proper formatting
		// TODO(jamestalmage): Figure out why it's needed and document it here
		return ` \n ${this.spinnerChar()} ${str}`;
	}
	_test(test) {
		const SPINNER_WIDTH = 3;
		const PADDING = 1;
		let title = cliTruncate(test.title, process.stdout.columns - SPINNER_WIDTH - PADDING);

		if (test.error || test.failing) {
			title = colors.error(test.title);
		}

		return title + '\n' + this.reportCounts();
	}
	unhandledError(err) {
		if (err.type === 'exception') {
			this.exceptionCount++;
		} else {
			this.rejectionCount++;
		}
	}
	reportCounts(time) {
		const lines = [
			this.passCount > 0 ? '\n  ' + colors.pass(this.passCount, 'passed') : '',
			this.knownFailureCount > 0 ? '\n  ' + colors.error(this.knownFailureCount, plur('known failure', this.knownFailureCount)) : '',
			this.failCount > 0 ? '\n  ' + colors.error(this.failCount, 'failed') : '',
			this.skipCount > 0 ? '\n  ' + colors.skip(this.skipCount, 'skipped') : '',
			this.todoCount > 0 ? '\n  ' + colors.todo(this.todoCount, 'todo') : ''
		].filter(Boolean);

		if (time && lines.length > 0) {
			lines[0] += ' ' + time;
		}

		return lines.join('');
	}
	finish(runStatus) {
		this.clearInterval();
		let time;

		if (this.options.watching) {
			time = chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']');
		}

		let status = this.reportCounts(time) + '\n';

		if (this.rejectionCount > 0) {
			status += '  ' + colors.error(this.rejectionCount, plur('rejection', this.rejectionCount)) + '\n';
		}

		if (this.exceptionCount > 0) {
			status += '  ' + colors.error(this.exceptionCount, plur('exception', this.exceptionCount)) + '\n';
		}

		if (runStatus.previousFailCount > 0) {
			status += '  ' + colors.error(runStatus.previousFailCount, 'previous', plur('failure', runStatus.previousFailCount), 'in test files that were not rerun') + '\n';
		}

		if (this.knownFailureCount > 0) {
			for (const test of runStatus.knownFailures) {
				const title = test.title;
				status += '\n   ' + colors.title(title) + '\n';
				// TODO: Output description with link
				// status += colors.stack(description);
			}
		}

		status += '\n';
		if (this.failCount > 0) {
			runStatus.errors.forEach(test => {
				if (!test.error) {
					return;
				}

				status += '  ' + colors.title(test.title) + '\n';

				if (test.logs) {
					test.logs.forEach(log => {
						const logLines = indentString(colors.log(log), 6);
						const logLinesWithLeadingFigure = logLines.replace(
							/^ {6}/,
							`    ${colors.information(figures.info)} `
						);

						status += logLinesWithLeadingFigure + '\n';
					});

					status += '\n';
				}

				if (test.error.source) {
					status += '  ' + colors.errorSource(test.error.source.file + ':' + test.error.source.line) + '\n';

					const excerpt = codeExcerpt(test.error.source, {maxWidth: process.stdout.columns});
					if (excerpt) {
						status += '\n' + indentString(excerpt, 2) + '\n';
					}
				}

				if (test.error.avaAssertionError) {
					const result = formatSerializedError(test.error);
					if (result.printMessage) {
						status += '\n' + indentString(test.error.message, 2) + '\n';
					}

					if (result.formatted) {
						status += '\n' + indentString(result.formatted, 2) + '\n';
					}

					const message = improperUsageMessages.forError(test.error);
					if (message) {
						status += '\n' + indentString(message, 2) + '\n';
					}
				} else if (test.error.message) {
					status += '\n' + indentString(test.error.message, 2) + '\n';
				}

				if (test.error.stack) {
					const stack = test.error.stack;
					if (stack.includes('\n')) {
						status += '\n' + indentString(colors.errorStack(stack), 2) + '\n';
					}
				}

				status += '\n\n\n';
			});
		}

		if (this.rejectionCount > 0 || this.exceptionCount > 0) {
			// TODO(sindresorhus): Figure out why this causes a test failure when switched to a for-of loop
			runStatus.errors.forEach(err => {
				if (err.title) {
					return;
				}

				if (err.type === 'exception' && err.name === 'AvaError') {
					status += '  ' + colors.error(cross + ' ' + err.message) + '\n\n';
				} else {
					const title = err.type === 'rejection' ? 'Unhandled Rejection' : 'Uncaught Exception';
					status += '  ' + colors.title(title) + '\n';

					if (err.name) {
						status += '  ' + colors.stack(err.summary) + '\n';
						status += colors.errorStack(err.stack) + '\n\n';
					} else {
						status += '  Threw non-error: ' + err.summary + '\n';
					}
				}
			});
		}

		if (runStatus.failFastEnabled === true && runStatus.remainingCount > 0 && runStatus.failCount > 0) {
			const remaining = 'At least ' + runStatus.remainingCount + ' ' + plur('test was', 'tests were', runStatus.remainingCount) + ' skipped.';
			status += '  ' + colors.information('`--fail-fast` is on. ' + remaining) + '\n\n';
		}

		if (runStatus.hasExclusive === true && runStatus.remainingCount > 0) {
			status += '  ' + colors.information('The .only() modifier is used in some tests.', runStatus.remainingCount, plur('test', runStatus.remainingCount), plur('was', 'were', runStatus.remainingCount), 'not run');
		}

		return '\n' + trimOffNewlines(status) + '\n';
	}
	section() {
		return '\n' + chalk.gray.dim('\u2500'.repeat(process.stdout.columns || 80));
	}
	clear() {
		return '';
	}
	write(str) {
		cliCursor.hide();
		this.currentStatus = str;
		this._update();
		this.statusLineCount = this.currentStatus.split('\n').length;
	}
	stdout(data) {
		this._update(data);
	}
	stderr(data) {
		this._update(data);
	}
	_update(data) {
		let str = '';
		let ct = this.statusLineCount;
		const columns = process.stdout.columns;
		let lastLine = this.lastLineTracker.lastLine();

		// Terminals automatically wrap text. We only need the last log line as seen on the screen.
		lastLine = lastLine.substring(lastLine.length - (lastLine.length % columns));

		// Don't delete the last log line if it's completely empty.
		if (lastLine.length > 0) {
			ct++;
		}

		// Erase the existing status message, plus the last log line.
		str += ansiEscapes.eraseLines(ct);

		// Rewrite the last log line.
		str += lastLine;

		if (str.length > 0) {
			this.stream.write(str);
		}

		if (data) {
			// Send new log data to the terminal, and update the last line status.
			this.lastLineTracker.update(this.stringDecoder.write(data));
			this.stream.write(data);
		}

		let currentStatus = this.currentStatus;

		if (currentStatus.length > 0) {
			lastLine = this.lastLineTracker.lastLine();
			// We need a newline at the end of the last log line, before the status message.
			// However, if the last log line is the exact width of the terminal a newline is implied,
			// and adding a second will cause problems.
			if (lastLine.length % columns) {
				currentStatus = '\n' + currentStatus;
			}
			// Rewrite the status message.
			this.stream.write(currentStatus);
		}
	}
}

module.exports = MiniReporter;
