'use strict';
var StringDecoder = require('string_decoder').StringDecoder;
var cliCursor = require('cli-cursor');
var lastLineTracker = require('last-line-stream/tracker');
var plur = require('plur');
var spinners = require('cli-spinners');
var chalk = require('chalk');
var cliTruncate = require('cli-truncate');
var colors = require('../colors');
var cross = require('figures').cross;

chalk.enabled = true;
Object.keys(colors).forEach(function (key) {
	colors[key].enabled = true;
});

function MiniReporter() {
	if (!(this instanceof MiniReporter)) {
		return new MiniReporter();
	}

	var spinnerDef = spinners.dots;
	this.spinnerFrames = spinnerDef.frames.map(function (c) {
		return chalk.gray.dim(c);
	});
	this.spinnerInterval = spinnerDef.interval;

	this.reset();
	this.stream = process.stderr;
	this.stringDecoder = new StringDecoder();
}

module.exports = MiniReporter;

MiniReporter.prototype.start = function () {
	var self = this;

	this.interval = setInterval(function () {
		self.spinnerIndex = (self.spinnerIndex + 1) % self.spinnerFrames.length;
		self.write(self.prefix());
	}, this.spinnerInterval);

	return this.prefix('');
};

MiniReporter.prototype.reset = function () {
	this.clearInterval();
	this.passCount = 0;
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
};

MiniReporter.prototype.spinnerChar = function () {
	return this.spinnerFrames[this.spinnerIndex];
};

MiniReporter.prototype.clearInterval = function () {
	clearInterval(this.interval);
	this.interval = null;
};

MiniReporter.prototype.test = function (test) {
	if (test.todo) {
		this.todoCount++;
	} else if (test.skip) {
		this.skipCount++;
	} else if (test.error) {
		this.failCount++;
	} else {
		this.passCount++;
	}

	if (test.todo || test.skip) {
		return;
	}

	return this.prefix(this._test(test));
};

MiniReporter.prototype.prefix = function (str) {
	str = str || this.currentTest;
	this.currentTest = str;

	// The space before the newline is required for proper formatting. (Not sure why).
	return ' \n ' + this.spinnerChar() + ' ' + str;
};

MiniReporter.prototype._test = function (test) {
	var SPINNER_WIDTH = 3;
	var PADDING = 1;
	var title = cliTruncate(test.title, process.stdout.columns - SPINNER_WIDTH - PADDING);

	if (test.error) {
		title = colors.error(test.title);
	}

	return title + '\n' + this.reportCounts();
};

MiniReporter.prototype.unhandledError = function (err) {
	if (err.type === 'exception') {
		this.exceptionCount++;
	} else {
		this.rejectionCount++;
	}
};

MiniReporter.prototype.reportCounts = function () {
	var status = '';

	if (this.passCount > 0) {
		status += '\n   ' + colors.pass(this.passCount, 'passed');
	}

	if (this.failCount > 0) {
		status += '\n   ' + colors.error(this.failCount, 'failed');
	}

	if (this.skipCount > 0) {
		status += '\n   ' + colors.skip(this.skipCount, 'skipped');
	}

	if (this.todoCount > 0) {
		status += '\n   ' + colors.todo(this.todoCount, 'todo');
	}

	return status;
};

MiniReporter.prototype.finish = function () {
	this.clearInterval();

	var status = this.reportCounts();

	if (this.rejectionCount > 0) {
		status += '\n   ' + colors.error(this.rejectionCount, plur('rejection', this.rejectionCount));
	}

	if (this.exceptionCount > 0) {
		status += '\n   ' + colors.error(this.exceptionCount, plur('exception', this.exceptionCount));
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
				description = '  ' + test.error.message + '\n  ' + stripFirstLine(test.error.stack);
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

			if (err.type === 'exception' && err.name === 'AvaError') {
				status += '\n\n  ' + colors.error(cross + ' ' + err.message) + '\n';
			} else {
				var title = err.type === 'rejection' ? 'Unhandled Rejection' : 'Uncaught Exception';
				var description = err.stack ? err.stack : JSON.stringify(err);

				status += '\n\n  ' + colors.error(i + '.', title) + '\n';
				status += '  ' + colors.stack(description);
			}
		});
	}

	if (this.failCount === 0 && this.rejectionCount === 0 && this.exceptionCount === 0) {
		status += '\n';
	}

	return status;
};

MiniReporter.prototype.write = function (str) {
	cliCursor.hide();
	this.currentStatus = str;
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

function stripFirstLine(message) {
	return message.replace(/^[^\n]*\n/, '');
}
