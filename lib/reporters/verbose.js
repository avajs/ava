'use strict';
var prettyMs = require('pretty-ms');
var figures = require('figures');
var chalk = require('chalk');
var plur = require('plur');
var repeating = require('repeating');
var colors = require('../colors');

Object.keys(colors).forEach(function (key) {
	colors[key].enabled = true;
});

function VerboseReporter() {
	if (!(this instanceof VerboseReporter)) {
		return new VerboseReporter();
	}

	Object.keys(VerboseReporter.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);
}

module.exports = VerboseReporter;

VerboseReporter.prototype.init = function (status) {
	this.status = status;
	this.write('');

	status.on('test', this.test);
	status.on('error', this.unhandledError);
	status.on('section', this.section);
	status.on('finish', this.finish);
	status.on('stdout', this.stdout);
	status.on('stderr', this.stderr);
};

VerboseReporter.prototype.test = function (test) {
	if (test.error) {
		var output = '  ' + colors.error(figures.cross) + ' ' + test.title + ' ' + colors.error(test.error.message);
		this.write(output);
		return;
	}

	if (test.todo) {
		var output = '  ' + colors.todo('- ' + test.title);
		this.write(output);
		return;
	} else if (test.skip) {
		var output = '  ' + colors.skip('- ' + test.title);
		this.write(output);
		return;
	}

	if (test.failing) {
		var output = '  ' + colors.error(figures.tick) + ' ' + colors.error(test.title);
		this.write(output);
		return;
	}

	var status = this.status;

	if (status.fileCount === 1 && status.testCount === 1 && test.title === '[anonymous]') {
		return;
	}

	// display duration only over a threshold
	var threshold = 100;
	var duration = test.duration > threshold ? colors.duration(' (' + prettyMs(test.duration) + ')') : '';

	var output = '  ' + colors.pass(figures.tick) + ' ' + test.title + duration;
	this.write(output);
};

VerboseReporter.prototype.unhandledError = function (err) {
	if (err.type === 'exception' && err.name === 'AvaError') {
		var output = colors.error('  ' + figures.cross + ' ' + err.message);
		this.write(output);
		return;
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

	this.write(output);
};

VerboseReporter.prototype.finish = function () {
	var status = this.status;
	var output = '\n';

	var lines = [
		status.failCount > 0 ?
			'  ' + colors.error(status.failCount, plur('test', status.failCount), 'failed') :
			'  ' + colors.pass(status.passCount, plur('test', status.passCount), 'passed'),
		status.knownFailureCount > 0 ? '  ' + colors.error(status.knownFailureCount, plur('known failure', status.knownFailureCount)) : '',
		status.skipCount > 0 ? '  ' + colors.skip(status.skipCount, plur('test', status.skipCount), 'skipped') : '',
		status.todoCount > 0 ? '  ' + colors.todo(status.todoCount, plur('test', status.todoCount), 'todo') : '',
		status.rejectionCount > 0 ? '  ' + colors.error(status.rejectionCount, 'unhandled', plur('rejection', status.rejectionCount)) : '',
		status.exceptionCount > 0 ? '  ' + colors.error(status.exceptionCount, 'uncaught', plur('exception', status.exceptionCount)) : '',
		status.previousFailCount > 0 ? '  ' + colors.error(status.previousFailCount, 'previous', plur('failure', status.previousFailCount), 'in test files that were not rerun') : ''
	].filter(Boolean);

	if (lines.length > 0) {
		lines[0] += ' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']');
		output += lines.join('\n');
	}

	var i = 0;

	if (status.knownFailureCount > 0) {
		status.knownFailures.forEach(function (test) {
			i++;
			output += '\n\n\n  ' + colors.error(i + '.', test.title);
		});
	}

	if (status.failCount > 0) {
		status.tests.forEach(function (test) {
			if (!(test.error && test.error.message)) {
				return;
			}

			i++;

			output += '\n\n\n  ' + colors.error(i + '.', test.title) + '\n';
			var stack = test.error.stack ? test.error.stack.trimRight() : '';
			output += '  ' + colors.stack(stack);
		});
	}

	this.write(output + '\n');
};

VerboseReporter.prototype.section = function () {
	var output = chalk.gray.dim(repeating('\u2500', process.stdout.columns || 80));
	this.write(output);
};

VerboseReporter.prototype.write = function (str) {
	console.error(str);
};

VerboseReporter.prototype.stdout = VerboseReporter.prototype.stderr = function (data) {
	process.stderr.write(data);
};
