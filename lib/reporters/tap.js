'use strict';
const supertap = require('supertap');
const stripAnsi = require('strip-ansi');

function dumpError(error, includeMessage) {
	const obj = Object.assign({}, error.object);
	if (error.name) {
		obj.name = error.name;
	}
	if (includeMessage && error.message) {
		obj.message = error.message;
	}

	if (error.avaAssertionError) {
		if (error.assertion) {
			obj.assertion = error.assertion;
		}
		if (error.operator) {
			obj.operator = error.operator;
		}
		if (error.values.length > 0) {
			obj.values = error.values.reduce((acc, value) => {
				acc[value.label] = stripAnsi(value.formatted);
				return acc;
			}, {});
		}
	}

	if (error.stack) {
		obj.at = error.stack.split('\n')[0];
	}

	return obj;
}

class TapReporter {
	constructor() {
		this.i = 0;
	}

	start() {
		return supertap.start();
	}

	test(test) {
		return supertap.test(test.title, {
			passed: !test.error,
			index: ++this.i,
			todo: test.todo,
			skip: test.skip,
			comment: test.logs,
			error: test.error ? dumpError(test.error, true) : null
		});
	}

	unhandledError(err) {
		let error;

		// AvaErrors don't have stack traces
		if (err.type !== 'exception' || err.name !== 'AvaError') {
			error = dumpError(err, false);
		}

		return supertap.test(err.message, {
			passed: false,
			index: ++this.i,
			error
		});
	}

	finish(runStatus) {
		return supertap.finish({
			passed: runStatus.passCount,
			failed: runStatus.failCount,
			skipped: runStatus.skipCount,
			crashed: runStatus.rejectionCount + runStatus.exceptionCount
		});
	}

	write(str) {
		console.log(str);
	}

	stdout(data) {
		process.stderr.write(data);
	}

	stderr(data) {
		this.stdout(data);
	}
}

module.exports = TapReporter;
