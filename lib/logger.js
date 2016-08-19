'use strict';
var arrify = require('arrify');
var autoBind = require('auto-bind');

function Logger(reporters) {
	if (!(this instanceof Logger)) {
		throw new TypeError('Class constructor Logger cannot be invoked without \'new\'');
	}

	this.reporters = arrify(reporters);

	autoBind(this);
}

module.exports = Logger;

Logger.prototype.start = function (runStatus) {
	var self = this;
	this.reporters.filter(function (reporter) {
		return reporter.start;
	}).forEach(function (reporter) {
		self.write(reporter.start(runStatus), runStatus);
	});
};

Logger.prototype.reset = function (runStatus) {
	var self = this;
	this.reporters.filter(function (reporter) {
		return reporter.reset;
	}).forEach(function (reporter) {
		self.write(reporter.reset(runStatus), runStatus);
	});
};

Logger.prototype.test = function (test, runStatus) {
	var self = this;
	this.reporters.forEach(function (reporter) {
		self.write(reporter.test(test, runStatus), runStatus);
	});
};

Logger.prototype.unhandledError = function (err, runStatus) {
	var self = this;
	this.reporters.filter(function (reporter) {
		return reporter.reset;
	}).forEach(function (reporter) {
		self.write(reporter.unhandledError(err, runStatus), runStatus);
	});
};

Logger.prototype.finish = function (runStatus) {
	var self = this;
	this.reporters.filter(function (reporter) {
		return reporter.finish;
	}).forEach(function (reporter) {
		self.write(reporter.finish(runStatus), runStatus);
	});
};

Logger.prototype.section = function () {
	var self = this;
	this.reporters.filter(function (reporter) {
		return reporter.section;
	}).forEach(function (reporter) {
		self.write(reporter.section());
	});
};

Logger.prototype.clear = function () {
	var self = this;
	return this.reporters.filter(function (reporter) {
		return reporter.clear;
	}).reduce(function (acc, reporter) {
		self.write(reporter.clear());
		return acc || true;
	}, false);
};

Logger.prototype.write = function (str, runStatus) {
	if (typeof str === 'undefined') {
		return;
	}

	this.reporters.forEach(function (reporter) {
		reporter.write(str, runStatus);
	});
};

Logger.prototype.stdout = function (data, runStatus) {
	this.reporters.filter(function (reporter) {
		return reporter.stdout;
	}).forEach(function (reporter) {
		reporter.stdout(data, runStatus);
	});
};

Logger.prototype.stderr = function (data, runStatus) {
	this.reporters.filter(function (reporter) {
		return reporter.stderr;
	}).forEach(function (reporter) {
		reporter.stderr(data, runStatus);
	});
};

Logger.prototype.exit = function (code) {
	// TODO: figure out why this needs to be here to
	// correctly flush the output when multiple test files
	process.stdout.write('');
	process.stderr.write('');

	// timeout required to correctly flush IO on Node.js 0.10 on Windows
	setTimeout(function () {
		process.exit(code); // eslint-disable-line xo/no-process-exit
	}, process.env.AVA_APPVEYOR ? 500 : 0);
};
