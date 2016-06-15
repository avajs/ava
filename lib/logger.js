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

Logger.prototype.start = function (runStatus) {
	if (!this.reporter.start) {
		return;
	}

	this.write(this.reporter.start(runStatus), runStatus);
};

Logger.prototype.reset = function (runStatus) {
	if (!this.reporter.reset) {
		return;
	}

	this.write(this.reporter.reset(runStatus), runStatus);
};

Logger.prototype.test = function (test, runStatus) {
	this.write(this.reporter.test(test, runStatus), runStatus);
};

Logger.prototype.unhandledError = function (err, runStatus) {
	if (!this.reporter.unhandledError) {
		return;
	}

	this.write(this.reporter.unhandledError(err, runStatus), runStatus);
};

Logger.prototype.finish = function (runStatus) {
	if (!this.reporter.finish) {
		return;
	}

	this.write(this.reporter.finish(runStatus), runStatus);
};

Logger.prototype.section = function () {
	if (!this.reporter.section) {
		return;
	}

	this.write(this.reporter.section());
};

Logger.prototype.clear = function () {
	if (!this.reporter.clear) {
		return false;
	}

	this.write(this.reporter.clear());
	return true;
};

Logger.prototype.write = function (str, runStatus) {
	if (typeof str === 'undefined') {
		return;
	}

	this.reporter.write(str, runStatus);
};

Logger.prototype.stdout = function (data, runStatus) {
	if (!this.reporter.stdout) {
		return;
	}

	this.reporter.stdout(data, runStatus);
};

Logger.prototype.stderr = function (data, runStatus) {
	if (!this.reporter.stderr) {
		return;
	}

	this.reporter.stderr(data, runStatus);
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
