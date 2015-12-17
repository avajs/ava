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

exports.start = function () {
	return 'TAP version 13';
};

var i = 0;

exports.test = function (test) {
	var output;

	if (test.error) {
		output = [
			'# ' + test.title,
			format('not ok %d - %s', ++i, test.error.message),
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
			format('ok %d - %s', ++i, test.title)
		];
	}

	return output.join('\n');
};

exports.unhandledError = function (err) {
	var output = [
		'# ' + err.message,
		format('not ok %d - %s', ++i, err.message),
		'  ---',
		'    name: ' + err.name,
		'    at: ' + getSourceFromStack(err.stack, 1),
		'  ...'
	];

	return output.join('\n');
};

exports.finish = function (passCount, failCount, rejectionCount, exceptionCount) {
	var output = [
		'',
		'1..' + (passCount + failCount),
		'# tests ' + (passCount + failCount),
		'# pass ' + passCount,
		'# fail ' + (failCount + rejectionCount + exceptionCount),
		''
	];

	return output.join('\n');
};
