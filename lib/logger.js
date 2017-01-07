'use strict';
const autoBind = require('auto-bind');

class Logger {
	constructor(reporter) {
		this.reporter = reporter;
		autoBind(this);
	}
	start(runStatus) {
		if (!this.reporter.start) {
			return;
		}

		this.write(this.reporter.start(runStatus), runStatus);
	}
	reset(runStatus) {
		if (!this.reporter.reset) {
			return;
		}

		this.write(this.reporter.reset(runStatus), runStatus);
	}
	test(test, runStatus) {
		this.write(this.reporter.test(test, runStatus), runStatus);
	}
	unhandledError(err, runStatus) {
		if (!this.reporter.unhandledError) {
			return;
		}

		this.write(this.reporter.unhandledError(err, runStatus), runStatus);
	}
	finish(runStatus) {
		if (!this.reporter.finish) {
			return;
		}

		this.write(this.reporter.finish(runStatus), runStatus);
	}
	section() {
		if (!this.reporter.section) {
			return;
		}

		this.write(this.reporter.section());
	}
	clear() {
		if (!this.reporter.clear) {
			return false;
		}

		this.write(this.reporter.clear());
		return true;
	}
	write(str, runStatus) {
		if (typeof str === 'undefined') {
			return;
		}

		this.reporter.write(str, runStatus);
	}
	stdout(data, runStatus) {
		if (!this.reporter.stdout) {
			return;
		}

		this.reporter.stdout(data, runStatus);
	}
	stderr(data, runStatus) {
		if (!this.reporter.stderr) {
			return;
		}

		this.reporter.stderr(data, runStatus);
	}
	exit(code) {
		process.exit(code); // eslint-disable-line unicorn/no-process-exit
	}
}

module.exports = Logger;
