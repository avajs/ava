'use strict';
const StringDecoder = require('string_decoder').StringDecoder;
const cliCursor = require('cli-cursor');
const lastLineTracker = require('last-line-stream/tracker');
const plur = require('plur');
const spinners = require('cli-spinners');
const chalk = require('chalk');
const cliTruncate = require('cli-truncate');
const cross = require('figures').cross;
const indentString = require('indent-string');
const formatAssertError = require('../format-assert-error');
const extractStack = require('../extract-stack');
const codeExcerpt = require('../code-excerpt');
const colors = require('../colors');

// TODO(@jamestalamge): This should be fixed in log-update and ansi-escapes once we are confident it's a good solution.
const CSI = '\u001b[';
const ERASE_LINE = CSI + '2K';
const CURSOR_TO_COLUMN_0 = CSI + '0G';
const CURSOR_UP = CSI + '1A';

// Returns a string that will erase `count` lines from the end of the terminal.
function eraseLines(count) {
	let clear = '';

	for (let i = 0; i < count; i++) {
		clear += ERASE_LINE + (i < count - 1 ? CURSOR_UP : '');
	}

	if (count) {
		clear += CURSOR_TO_COLUMN_0;
	}

	return clear;
}

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

		let status = this.reportCounts(time);

		if (this.rejectionCount > 0) {
			status += '\n  ' + colors.error(this.rejectionCount, plur('rejection', this.rejectionCount));
		}

		if (this.exceptionCount > 0) {
			status += '\n  ' + colors.error(this.exceptionCount, plur('exception', this.exceptionCount));
		}

		if (runStatus.previousFailCount > 0) {
			status += '\n  ' + colors.error(runStatus.previousFailCount, 'previous', plur('failure', runStatus.previousFailCount), 'in test files that were not rerun');
		}

		if (this.knownFailureCount > 0) {
			for (const test of runStatus.knownFailures) {
				const title = test.title;
				status += '\n\n   ' + colors.title(title);
				// TODO: Output description with link
				// status += colors.stack(description);
			}
		}

		if (this.failCount > 0) {
			runStatus.errors.forEach((test, index) => {
				if (!test.error) {
					return;
				}

				const title = test.error ? test.title : 'Unhandled Error';
				const beforeSpacing = index === 0 ? '\n\n' : '\n\n\n\n';

				status += beforeSpacing + '  ' + colors.title(title) + '\n';
				if (test.error.source) {
					status += '  ' + colors.errorSource(test.error.source.file + ':' + test.error.source.line) + '\n';

					const excerpt = codeExcerpt(test.error.source, {maxWidth: process.stdout.columns});
					if (excerpt) {
						status += '\n' + indentString(excerpt, 2) + '\n';
					}
				}

				if (test.error.showOutput) {
					status += '\n' + indentString(formatAssertError(test.error), 2);
				}

				// `.trim()` is needed, because default `err.message` is ' ' (see lib/assert.js)
				if (test.error.message.trim()) {
					status += '\n' + indentString(test.error.message, 2) + '\n';
				}

				if (test.error.stack) {
					const extracted = extractStack(test.error.stack);
					if (extracted.includes('\n')) {
						status += '\n' + indentString(colors.errorStack(extracted), 2);
					}
				}
			});
		}

		if (this.rejectionCount > 0 || this.exceptionCount > 0) {
			// TODO(sindresorhus): Figure out why this causes a test failure when switched to a for-of loop
			runStatus.errors.forEach(err => {
				if (err.title) {
					return;
				}

				if (err.type === 'exception' && err.name === 'AvaError') {
					status += '\n\n  ' + colors.error(cross + ' ' + err.message);
				} else {
					const title = err.type === 'rejection' ? 'Unhandled Rejection' : 'Uncaught Exception';
					let description = err.stack ? err.stack.trimRight() : JSON.stringify(err);
					description = description.split('\n');
					const errorTitle = err.name ? description[0] : 'Threw non-error: ' + description[0];
					const errorStack = description.slice(1).join('\n');

					status += '\n\n  ' + colors.title(title) + '\n';
					status += '  ' + colors.stack(errorTitle) + '\n';
					status += colors.errorStack(errorStack);
				}
			});
		}

		if (runStatus.failFastEnabled === true && runStatus.remainingCount > 0 && runStatus.failCount > 0) {
			const remaining = 'At least ' + runStatus.remainingCount + ' ' + plur('test was', 'tests were', runStatus.remainingCount) + ' skipped.';
			status += '\n\n  ' + colors.information('`--fail-fast` is on. ' + remaining);
		}

		if (runStatus.hasExclusive === true && runStatus.remainingCount > 0) {
			status += '\n\n  ' + colors.information('The .only() modifier is used in some tests.', runStatus.remainingCount, plur('test', runStatus.remainingCount), plur('was', 'were', runStatus.remainingCount), 'not run');
		}

		return status + '\n\n';
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
		str += eraseLines(ct);

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
