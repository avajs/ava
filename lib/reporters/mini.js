'use strict';
var cliCursor = require('cli-cursor');
var lastLineTracker = require('last-line-stream/tracker');
var StringDecoder = require('string_decoder').StringDecoder;
var plur = require('plur');
var colors = require('../colors');
var beautifyStack = require('../beautify-stack');

function MiniReporter() {
	if (!(this instanceof MiniReporter)) {
		return new MiniReporter();
	}

	this.passCount = 0;
	this.failCount = 0;
	this.skipCount = 0;
	this.rejectionCount = 0;
	this.exceptionCount = 0;
	this.currentStatus = '';
	this.statusLineCount = 0;
	this.lastLineTracker = lastLineTracker();
	this.stream = process.stderr;
	this.stringDecoder = new StringDecoder();
}

module.exports = MiniReporter;

MiniReporter.prototype.start = function () {
	return '';
};

MiniReporter.prototype.test = function (test) {
	var status = '';
	var title;

	if (test.skip) {
		title = colors.skip('- ' + test.title);
		this.skipCount++;
	} else if (test.error) {
		title = colors.error(test.title);
		this.failCount++;
	} else {
		title = colors.pass(test.title);
		this.passCount++;
	}

	status += '  ' + title;
	status += '\n\n';

	if (this.passCount > 0) {
		status += '  ' + colors.pass(this.passCount, 'passed');
	}

	if (this.failCount > 0) {
		status += '  ' + colors.error(this.failCount, 'failed');
	}

	return status;
};

MiniReporter.prototype.unhandledError = function (err) {
	if (err.type === 'exception') {
		this.exceptionCount++;
	} else {
		this.rejectionCount++;
	}
};

MiniReporter.prototype.finish = function () {
	var status = '';

	if (this.passCount > 0) {
		status += '  ' + colors.pass(this.passCount, 'passed');
	}

	if (this.skipCount > 0) {
		status += '  ' + colors.skip(this.skipCount, 'skipped');
	}

	if (this.failCount > 0) {
		status += '  ' + colors.error(this.failCount, 'failed');
	}

	if (this.rejectionCount > 0) {
		status += '\n  ' + colors.error(this.rejectionCount, plur('rejection', this.rejectionCount));
	}

	if (this.exceptionCount > 0) {
		status += '\n  ' + colors.error(this.exceptionCount, plur('exception', this.exceptionCount));
	}

	var i = 0;

	if (this.failCount > 0) {
		this.api.errors.forEach(function (test) {
			if (!test.error || !test.error.message) {
				return;
			}

			i++;

			var title = test.error ? test.title : 'Unhandled Error';
			var description;

			if (test.error) {
				description = '  ' + test.error.message;
				description += '\n  ' + beautifyStack(test.error.stack);
			} else {
				description = JSON.stringify(test);
			}

			status += '\n\n  ' + colors.error(i + '.', title) + '\n';
			status += colors.stack(description);
		});
	}

	if (this.rejectionCount > 0 || this.exceptionCount > 0) {
		this.api.errors.forEach(function (err) {
			if (err.title) {
				return;
			}

			i++;

			var title = err.type === 'rejection' ? 'Unhandled Rejection' : 'Uncaught Exception';
			var description = err.stack ? beautifyStack(err.stack) : JSON.stringify(err);

			status += '\n\n  ' + colors.error(i + '.', title) + '\n';
			status += '  ' + colors.stack(description);
		});
	}

	if (this.failCount === 0 && this.rejectionCount === 0 && this.exceptionCount === 0) {
		status += '\n';
	}

	return status;
};

MiniReporter.prototype.write = function (str) {
	cliCursor.hide();
	this.currentStatus = str + '\n';
	this._update();
	this.statusLineCount = this.currentStatus.split('\n').length;
};

MiniReporter.prototype.stdout = MiniReporter.prototype.stderr = function (data) {
	this._update(data);
};

MiniReporter.prototype._update = function (data) {
	var str = '';
	var ct = this.statusLineCount;
	var columns = process.stdout.columns;
	var lastLine = this.lastLineTracker.lastLine();

	// Terminals automatically wrap text. We only need the last log line as seen on the screen.
	lastLine = lastLine.substring(lastLine.length - (lastLine.length % columns));

	// Don't delete the last log line if it's completely empty.
	if (lastLine.length) {
		ct++;
	}

	// Erase the existing status message, plus the last log line.
	str += eraseLines(ct);

	// Rewrite the last log line.
	str += lastLine;

	if (str.length) {
		this.stream.write(str);
	}

	if (data) {
		// send new log data to the terminal, and update the last line status.
		this.lastLineTracker.update(this.stringDecoder.write(data));
		this.stream.write(data);
	}

	var currentStatus = this.currentStatus;
	if (currentStatus.length) {
		lastLine = this.lastLineTracker.lastLine();
		// We need a newline at the end of the last log line, before the status message.
		// However, if the last log line is the exact width of the terminal a newline is implied,
		// and adding a second will cause problems.
		if (lastLine.length % columns) {
			currentStatus = '\n' + currentStatus;
		}
		// rewrite the status message.
		this.stream.write(currentStatus);
	}
};

// TODO(@jamestalamge): This should be fixed in log-update and ansi-escapes once we are confident it's a good solution.
var CSI = '\u001b[';
var ERASE_LINE = CSI + '2K';
var CURSOR_TO_COLUMN_0 = CSI + '0G';
var CURSOR_UP = CSI + '1A';

// Returns a string that will erase `count` lines from the end of the terminal.
function eraseLines(count) {
	var clear = '';

	for (var i = 0; i < count; i++) {
		clear += ERASE_LINE + (i < count - 1 ? CURSOR_UP : '');
	}
	if (count) {
		clear += CURSOR_TO_COLUMN_0;
	}

	return clear;
}
