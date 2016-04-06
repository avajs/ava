'use strict';
var prettyMs = require('pretty-ms');
var figures = require('figures');
var plur = require('plur');
var colors = require('../colors');

Object.keys(colors).forEach(function (key) {
	colors[key].enabled = true;
});

function VerboseReporter() {
	if (!(this instanceof VerboseReporter)) {
		return new VerboseReporter();
	}
}

module.exports = VerboseReporter;

VerboseReporter.prototype.start = function () {
	return '';
};

VerboseReporter.prototype.test = function (test, testData) {
	if (test.error) {
		return '  ' + colors.error(figures.cross) + ' ' + test.title + ' ' + colors.error(test.error.message);
	}

	if (test.todo) {
		return '  ' + colors.todo('- ' + test.title);
	} else if (test.skip) {
		return '  ' + colors.skip('- ' + test.title);
	}

	if (testData.fileCount === 1 && testData.testCount === 1 && test.title === '[anonymous]') {
		return undefined;
	}

	// display duration only over a threshold
	var threshold = 100;
	var duration = test.duration > threshold ? colors.duration(' (' + prettyMs(test.duration) + ')') : '';

	return '  ' + colors.pass(figures.tick) + ' ' + test.title + duration;
};

VerboseReporter.prototype.unhandledError = function (err) {
	if (err.type === 'exception' && err.name === 'AvaError') {
		return colors.error('  ' + figures.cross + ' ' + err.message);
	}

	var types = {
		rejection: 'Unhandled Rejection',
		exception: 'Uncaught Exception'
	};

	var output = colors.error(types[err.type] + ':', err.file) + '\n';

	if (err.stack) {
		output += '  ' + colors.stack(err.stack) + '\n';
	} else {
		output += '  ' + colors.stack(JSON.stringify(err)) + '\n';
	}

	output += '\n';

	return output;
};

VerboseReporter.prototype.finish = function (testData) {
	var output = '\n';

	if (testData.failCount > 0) {
		output += '  ' + colors.error(testData.failCount, plur('test', testData.failCount), 'failed') + '\n';
	} else {
		output += '  ' + colors.pass(testData.passCount, plur('test', testData.passCount), 'passed') + '\n';
	}

	if (testData.skipCount > 0) {
		output += '  ' + colors.skip(testData.skipCount, plur('test', testData.skipCount), 'skipped') + '\n';
	}

	if (testData.todoCount > 0) {
		output += '  ' + colors.todo(testData.todoCount, plur('test', testData.todoCount), 'todo') + '\n';
	}

	if (testData.rejectionCount > 0) {
		output += '  ' + colors.error(testData.rejectionCount, 'unhandled', plur('rejection', testData.rejectionCount)) + '\n';
	}

	if (testData.exceptionCount > 0) {
		output += '  ' + colors.error(testData.exceptionCount, 'uncaught', plur('exception', testData.exceptionCount)) + '\n';
	}

	if (testData.failCount > 0) {
		output += '\n';

		var i = 0;

		testData.tests.forEach(function (test) {
			if (!(test.error && test.error.message)) {
				return;
			}

			i++;

			output += '  ' + colors.error(i + '.', test.title) + '\n';
			output += '  ' + colors.stack(test.error.stack) + '\n';
		});
	}

	return output;
};

VerboseReporter.prototype.write = function (str) {
	console.error(str);
};

VerboseReporter.prototype.stdout = VerboseReporter.prototype.stderr = function (data) {
	process.stderr.write(data);
};
