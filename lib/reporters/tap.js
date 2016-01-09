'use strict';
var format = require('util').format;

// Parses stack trace and extracts original function name, file name and line.
function getSourceFromStack(stack, index) {
	return stack
		.split('\n')
		.slice(index, index + 1)
		.join('')
		.replace(/^\s+at /, '');
}

function TapReporter() {
	if (!(this instanceof TapReporter)) {
		return new TapReporter();
	}

	this.i = 0;
}

module.exports = TapReporter;

TapReporter.prototype.start = function () {
	return 'TAP version 13';
};

TapReporter.prototype.test = function (test) {
	var output;

	if (test.error) {
		output = [
			'# ' + test.title,
			format('not ok %d - %s', ++this.i, test.error.message),
			'  ---',
			'    operator: ' + test.error.operator,
			'    expected: ' + test.error.expected,
			'    actual: ' + test.error.actual,
			'    at: ' + getSourceFromStack(test.error.stack, 3),
			'  ...'
		];
	} else {
		output = [
			'# ' + test.title,
			format('ok %d - %s', ++this.i, test.title)
		];
	}

	return output.join('\n');
};

TapReporter.prototype.unhandledError = function (err) {
	var output = [
		'# ' + err.message,
		format('not ok %d - %s', ++this.i, err.message),
		'  ---',
		'    name: ' + err.name,
		'    at: ' + getSourceFromStack(err.stack, 1),
		'  ...'
	];

	return output.join('\n');
};

TapReporter.prototype.finish = function () {
	var output = [
		'',
		'1..' + (this.api.passCount + this.api.failCount),
		'# tests ' + (this.api.passCount + this.api.failCount),
		'# pass ' + this.api.passCount,
		'# skip ' + this.api.skipCount,
		'# fail ' + (this.api.failCount + this.api.rejectionCount + this.api.exceptionCount),
		''
	];

	return output.join('\n');
};

TapReporter.prototype.write = function (str) {
	console.log(str);
};

TapReporter.prototype.stdout = TapReporter.prototype.stderr = function (data) {
	process.stderr.write(data);
};
