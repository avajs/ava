'use strict';

function Logger(reporter) {
	if (!(this instanceof Logger)) {
		throw new TypeError('Class constructor Logger cannot be invoked without \'new\'');
	}

	Object.keys(Logger.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);

	this.reporter = reporter;
}

module.exports = Logger;

Logger.prototype.start = function (testData) {
	if (!this.reporter.start) {
		return;
	}

	this.write(this.reporter.start(testData), testData);
};

Logger.prototype.reset = function (testData) {
	if (!this.reporter.reset) {
		return;
	}

	this.write(this.reporter.reset(testData), testData);
};

Logger.prototype.test = function (test, testData) {
	this.write(this.reporter.test(test, testData), testData);
};

Logger.prototype.unhandledError = function (err, testData) {
	if (!this.reporter.unhandledError) {
		return;
	}

	this.write(this.reporter.unhandledError(err, testData), testData);
};

Logger.prototype.finish = function (testData) {
	if (!this.reporter.finish) {
		return;
	}

	this.write(this.reporter.finish(testData), testData);
};

Logger.prototype.write = function (str, testData) {
	if (typeof str === 'undefined') {
		return;
	}

	this.reporter.write(str, testData);
};

Logger.prototype.stdout = function (data, testData) {
	if (!this.reporter.stdout) {
		return;
	}

	this.reporter.stdout(data, testData);
};

Logger.prototype.stderr = function (data, testData) {
	if (!this.reporter.stderr) {
		return;
	}

	this.reporter.stderr(data, testData);
};

Logger.prototype.exit = function (code) {
	// TODO: figure out why this needs to be here to
	// correctly flush the output when multiple test files
	process.stdout.write('');
	process.stderr.write('');

	// timeout required to correctly flush IO on Node.js 0.10 on Windows
	setTimeout(function () {
		process.exit(code);
	}, process.env.AVA_APPVEYOR ? 500 : 0);
};
