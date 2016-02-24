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

Logger.prototype.start = function () {
	if (!this.reporter.start) {
		return;
	}

	this.write(this.reporter.start());
};

Logger.prototype.reset = function () {
	if (!this.reporter.reset) {
		return;
	}

	this.write(this.reporter.reset());
};

Logger.prototype.test = function (test) {
	this.write(this.reporter.test(test));
};

Logger.prototype.unhandledError = function (err) {
	if (!this.reporter.unhandledError) {
		return;
	}

	this.write(this.reporter.unhandledError(err));
};

Logger.prototype.finish = function () {
	if (!this.reporter.finish) {
		return;
	}

	this.write(this.reporter.finish());
};

Logger.prototype.write = function (str) {
	if (typeof str === 'undefined') {
		return;
	}

	this.reporter.write(str);
};

Logger.prototype.stdout = function (data) {
	if (!this.reporter.stdout) {
		return;
	}

	this.reporter.stdout(data);
};

Logger.prototype.stderr = function (data) {
	if (!this.reporter.stderr) {
		return;
	}

	this.reporter.stderr(data);
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
