'use strict';
var StringDecoder = require('string_decoder').StringDecoder;
var cliCursor = require('cli-cursor');
var lastLineTracker = require('last-line-stream/tracker');
var plur = require('plur');
var spinners = require('cli-spinners');
var chalk = require('chalk');
var cliTruncate = require('cli-truncate');
var cross = require('figures').cross;
var repeating = require('repeating');
var objectAssign = require('object-assign');
var colors = require('../colors');

chalk.enabled = true;
Object.keys(colors).forEach(function (key) {
	colors[key].enabled = true;
});

function MiniReporter(options) {
	if (!(this instanceof MiniReporter)) {
		return new MiniReporter(options);
	}

	Object.keys(MiniReporter.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);

	var spinnerDef = spinners[process.platform === 'win32' ? 'line' : 'dots'];
	this.spinnerFrames = spinnerDef.frames.map(function (c) {
		return chalk.gray.dim(c);
	});

	this.spinnerInterval = spinnerDef.interval;
	this.options = objectAssign({}, options);
	this.stream = process.stderr;
	this.stringDecoder = new StringDecoder();
}

module.exports = MiniReporter;

MiniReporter.prototype.init = function (status) {
	if (this.status) {
		this.status.removeListener('test', this.test);
		this.status.removeListener('clear', this.clear);
		this.status.removeListener('section', this.section);
		this.status.removeListener('finish', this.finish);
		this.status.removeListener('stdout', this.stdout);
		this.status.removeListener('stderr', this.stderr);
	}
	
	this.reset();
	this.status = status;
	this.write(this.prefix(''));

	status.on('test', this.test);
	status.on('clear', this.clear);
	status.on('section', this.section);
	status.on('finish', this.finish);
	status.on('stdout', this.stdout);
	status.on('stderr', this.stderr);

	var self = this;

	this.interval = setInterval(function () {
		self.spinnerIndex = (self.spinnerIndex + 1) % self.spinnerFrames.length;
		self.write(self.prefix());
	}, this.spinnerInterval);
};

MiniReporter.prototype.reset = function () {
	this.clearInterval();
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
	if (test.todo || test.skip) {
		return;
	}

	this.write(this.prefix(this._test(test)));
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

	if (test.error || test.failing) {
		title = colors.error(test.title);
	}

	return title + '\n' + this.reportCounts();
};

MiniReporter.prototype.reportCounts = function (time) {
	var status = this.status;

	var lines = [
		status.passCount > 0 ? '\n   ' + colors.pass(status.passCount, 'passed') : '',
		status.knownFailureCount > 0 ? '\n   ' + colors.error(status.knownFailureCount, plur('known failure', status.knownFailureCount)) : '',
		status.failCount > 0 ? '\n   ' + colors.error(status.failCount, 'failed') : '',
		status.skipCount > 0 ? '\n   ' + colors.skip(status.skipCount, 'skipped') : '',
		status.todoCount > 0 ? '\n   ' + colors.todo(status.todoCount, 'todo') : ''
	].filter(Boolean);

	if (time && lines.length > 0) {
		lines[0] += ' ' + time;
	}

	return lines.join('');
};

MiniReporter.prototype.finish = function () {
	this.clearInterval();
	var time;

	if (this.options.watching) {
		time = chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']');
	}

	var status = this.reportCounts(time);

	if (this.status.rejectionCount > 0) {
		status += '\n   ' + colors.error(this.status.rejectionCount, plur('rejection', this.status.rejectionCount));
	}

	if (this.status.exceptionCount > 0) {
		status += '\n   ' + colors.error(this.status.exceptionCount, plur('exception', this.status.exceptionCount));
	}

	if (this.status.previousFailCount > 0) {
		status += '\n   ' + colors.error(this.status.previousFailCount, 'previous', plur('failure', this.status.previousFailCount), 'in test files that were not rerun');
	}

	var i = 0;

	if (this.status.knownFailureCount > 0) {
		this.status.knownFailures.forEach(function (test) {
			i++;

			var title = test.title;

			status += '\n\n\n   ' + colors.error(i + '.', title);
			// TODO output description with link
			// status += colors.stack(description);
		});
	}

	if (this.status.failCount > 0) {
		this.status.errors.forEach(function (test) {
			if (!test.error || !test.error.message) {
				return;
			}

			i++;

			var title = test.error ? test.title : 'Unhandled Error';
			var description;

			if (test.error) {
				description = '   ' + test.error.message + '\n  ' + stripFirstLine(test.error.stack).trimRight();
			} else {
				description = JSON.stringify(test);
			}

			status += '\n\n\n   ' + colors.error(i + '.', title) + '\n';
			status += colors.stack(description);
		});
	}

	if (this.status.rejectionCount > 0 || this.status.exceptionCount > 0) {
		this.status.errors.forEach(function (err) {
			if (err.title) {
				return;
			}

			i++;

			if (err.type === 'exception' && err.name === 'AvaError') {
				status += '\n\n\n   ' + colors.error(cross + ' ' + err.message);
			} else {
				var title = err.type === 'rejection' ? 'Unhandled Rejection' : 'Uncaught Exception';
				var description = err.stack ? err.stack.trimRight() : JSON.stringify(err);

				status += '\n\n\n   ' + colors.error(i + '.', title) + '\n';
				status += '   ' + colors.stack(description);
			}
		});
	}

	this.write(status + '\n');
};

MiniReporter.prototype.section = function () {
	var columns = process.stdout.columns || 80;
	this.write('\n' + chalk.gray.dim(repeating('\u2500', columns)));
};

// used only in watch mode
MiniReporter.prototype.clear = function () {
	this.write('');
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
