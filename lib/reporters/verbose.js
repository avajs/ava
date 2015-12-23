'use strict';
var prettyMs = require('pretty-ms');
var figures = require('figures');
var chalk = require('chalk');
var plur = require('plur');

function beautifyStack(stack) {
	var re = /(?:^(?! {4}at\b).{6})|(?:\((?:[A-Z]:)?(?:[\\\/](?:(?!node_modules[\\\/]ava[\\\/])[^:\\\/])+)+:\d+:\d+\))/;
	var found = false;

	return stack.split('\n').filter(function (line) {
		var relevant = re.test(line);
		found = found || relevant;
		return !found || relevant;
	}).join('\n');
}

function VerboseReporter() {
	if (!(this instanceof VerboseReporter)) {
		return new VerboseReporter();
	}
}

module.exports = VerboseReporter;
module.exports._beautifyStack = beautifyStack;

VerboseReporter.prototype.start = function () {
	return '';
};

VerboseReporter.prototype.test = function (test) {
	if (test.error) {
		return '  ' + chalk.red(figures.cross) + ' ' + test.title + ' ' + chalk.red(test.error.message);
	}

	if (test.skip) {
		return '  ' + chalk.cyan('- ' + test.title);
	}

	if (this.api.fileCount === 1 && this.api.testCount === 1 && test.title === '[anonymous]') {
		return null;
	}

	// display duration only over a threshold
	var threshold = 100;
	var duration = test.duration > threshold ? chalk.gray.dim(' (' + prettyMs(test.duration) + ')') : '';

	return '  ' + chalk.green(figures.tick) + ' ' + test.title + duration;
};

VerboseReporter.prototype.unhandledError = function (err) {
	var types = {
		rejection: 'Unhandled Rejection',
		exception: 'Uncaught Exception'
	};

	var output = chalk.red(types[err.type] + ':', err.file) + '\n';

	if (err.stack) {
		output += '  ' + chalk.red(beautifyStack(err.stack)) + '\n';
	} else {
		output += '  ' + chalk.red(JSON.stringify(err)) + '\n';
	}

	output += '\n';

	return output;
};

VerboseReporter.prototype.finish = function () {
	var output = '\n';

	if (this.api.failCount > 0) {
		output += '  ' + chalk.red(this.api.failCount, plur('test', this.api.failCount), 'failed') + '\n';
	} else {
		output += '  ' + chalk.green(this.api.passCount, plur('test', this.api.passCount), 'passed') + '\n';
	}

	if (this.api.rejectionCount > 0) {
		output += '  ' + chalk.red(this.api.rejectionCount, 'unhandled', plur('rejection', this.api.rejectionCount)) + '\n';
	}

	if (this.api.exceptionCount > 0) {
		output += '  ' + chalk.red(this.api.exceptionCount, 'uncaught', plur('exception', this.api.exceptionCount)) + '\n';
	}

	if (this.api.failCount > 0) {
		output += '\n';

		var i = 0;

		this.api.tests.forEach(function (test) {
			if (!test.error.message) {
				return;
			}

			i++;

			output += '  ' + chalk.red(i + '.', test.title) + '\n';
			output += '  ' + chalk.red(beautifyStack(test.error.stack)) + '\n';
		});
	}

	return output;
};

VerboseReporter.prototype.write = function (str) {
	console.error(str);
};
