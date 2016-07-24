'use strict';
var format = require('util').format;
var stripAnsi = require('strip-ansi');

// Parses stack trace and extracts original function name, file name and line.
function getSourceFromStack(stack, index) {
	return stack
		.split('\n')
		.slice(index, index + 1)
		.join('')
		.replace(/^\s+ /, '');
}

function TapReporter() {
	if (!(this instanceof TapReporter)) {
		return new TapReporter();
	}

	Object.keys(TapReporter.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);

	this.i = 0;
}

module.exports = TapReporter;

TapReporter.prototype.init = function (status) {
	this.status = status;
	this.write('TAP version 13');

	status.on('test', this.test);
	status.on('error', this.unhandledError);
	status.on('finish', this.finish);
};

TapReporter.prototype.test = function (test) {
	var output;

	var directive = '';
	var passed = test.todo ? 'not ok' : 'ok';

	if (test.todo) {
		directive = '# TODO';
	} else if (test.skip) {
		directive = '# SKIP';
	}

	var title = stripAnsi(test.title);

	if (test.error) {
		output = [
			'# ' + title,
			format('not ok %d - %s', ++this.i, title),
			'  ---',
			'    operator: ' + test.error.operator,
			'    expected: ' + test.error.expected,
			'    actual: ' + test.error.actual,
			'    at: ' + getSourceFromStack(test.error.stack, 1),
			'  ...'
		];
	} else {
		output = [
			'# ' + title,
			format('%s %d - %s %s', passed, ++this.i, title, directive).trim()
		];
	}

	this.write(output.join('\n'));
};

TapReporter.prototype.unhandledError = function (err) {
	var output = [
		'# ' + err.message,
		format('not ok %d - %s', ++this.i, err.message)
	];
	// AvaErrors don't have stack traces.
	if (err.type !== 'exception' || err.name !== 'AvaError') {
		output.push(
			'  ---',
			'    name: ' + err.name,
			'    at: ' + getSourceFromStack(err.stack, 1),
			'  ...'
		);
	}

	this.write(output.join('\n'));
};

TapReporter.prototype.finish = function () {
	var status = this.status;
	var output = [
		'',
		'1..' + (status.passCount + status.failCount + status.skipCount),
		'# tests ' + (status.passCount + status.failCount + status.skipCount),
		'# pass ' + status.passCount
	];

	if (status.skipCount > 0) {
		output.push('# skip ' + status.skipCount);
	}

	output.push('# fail ' + (status.failCount + status.rejectionCount + status.exceptionCount), '');

	this.write(output.join('\n'));
};

TapReporter.prototype.write = function (str) {
	console.log(str);
};

