'use strict';
var logUpdate = require('log-update');
var colors = require('./colors');
var plur = require('plur');
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
	this.finished = false;
}

module.exports = MiniReporter;

MiniReporter.prototype.start = function () {
	return '';
};

MiniReporter.prototype.test = function (test) {
	var status = '\n';
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
	this.finished = true;

	var status = '\n';

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
	logUpdate.stderr(str);

	if (this.finished) {
		logUpdate.stderr.done();
	}
};
