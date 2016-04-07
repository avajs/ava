'use strict';
var prettyMs = require('pretty-ms');
var figures = require('figures');
var chalk = require('chalk');
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

VerboseReporter.prototype.test = function (test, runStatus) {
	if (test.error) {
		return '  ' + colors.error(figures.cross) + ' ' + test.title + ' ' + colors.error(test.error.message);
	}

	if (test.todo) {
		return '  ' + colors.todo('- ' + test.title);
	} else if (test.skip) {
		return '  ' + colors.skip('- ' + test.title);
	}

	if (runStatus.fileCount === 1 && runStatus.testCount === 1 && test.title === '[anonymous]') {
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

VerboseReporter.prototype.finish = function (runStatus) {
	var output = '\n';

	var lines = [
		runStatus.failCount > 0 ?
			'  ' + colors.error(runStatus.failCount, plur('test', runStatus.failCount), 'failed') :
			'  ' + colors.pass(runStatus.passCount, plur('test', runStatus.passCount), 'passed'),
		runStatus.skipCount > 0 ? '  ' + colors.skip(runStatus.skipCount, plur('test', runStatus.skipCount), 'skipped') : '',
		runStatus.todoCount > 0 ? '  ' + colors.todo(runStatus.todoCount, plur('test', runStatus.todoCount), 'todo') : '',
		runStatus.rejectionCount > 0 ? '  ' + colors.error(runStatus.rejectionCount, 'unhandled', plur('rejection', runStatus.rejectionCount)) : '',
		runStatus.exceptionCount > 0 ? '  ' + colors.error(runStatus.exceptionCount, 'uncaught', plur('exception', runStatus.exceptionCount)) : ''
	].filter(Boolean);

	if (lines.length > 0) {
		lines[0] += ' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']');
		output += lines.join('\n') + '\n';
	}

	if (runStatus.failCount > 0) {
		output += '\n';

		var i = 0;

		runStatus.tests.forEach(function (test) {
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
