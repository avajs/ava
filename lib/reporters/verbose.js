'use strict';
var path = require('path');
var indentString = require('indent-string');
var prettyMs = require('pretty-ms');
var figures = require('figures');
var chalk = require('chalk');
var plur = require('plur');
var repeating = require('repeating');
var formatAssertError = require('../format-assert-error');
var extractStack = require('../extract-stack');
var codeExcerpt = require('../code-excerpt');
var colors = require('../colors');

Object.keys(colors).forEach(function (key) {
	colors[key].enabled = true;
});

function VerboseReporter(options) {
	if (!(this instanceof VerboseReporter)) {
		return new VerboseReporter(options);
	}

	this.options = Object.assign({}, options);
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

	if (test.failing) {
		return '  ' + colors.error(figures.tick) + ' ' + colors.error(test.title);
	}

	if (runStatus.fileCount === 1 && runStatus.testCount === 1 && test.title === '[anonymous]') {
		return undefined;
	}

	// Display duration only over a threshold
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
		runStatus.knownFailureCount > 0 ? '  ' + colors.error(runStatus.knownFailureCount, plur('known failure', runStatus.knownFailureCount)) : '',
		runStatus.skipCount > 0 ? '  ' + colors.skip(runStatus.skipCount, plur('test', runStatus.skipCount), 'skipped') : '',
		runStatus.todoCount > 0 ? '  ' + colors.todo(runStatus.todoCount, plur('test', runStatus.todoCount), 'todo') : '',
		runStatus.rejectionCount > 0 ? '  ' + colors.error(runStatus.rejectionCount, 'unhandled', plur('rejection', runStatus.rejectionCount)) : '',
		runStatus.exceptionCount > 0 ? '  ' + colors.error(runStatus.exceptionCount, 'uncaught', plur('exception', runStatus.exceptionCount)) : '',
		runStatus.previousFailCount > 0 ? '  ' + colors.error(runStatus.previousFailCount, 'previous', plur('failure', runStatus.previousFailCount), 'in test files that were not rerun') : ''
	].filter(Boolean);

	if (lines.length > 0) {
		lines[0] += ' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']');
		output += lines.join('\n');
	}

	if (runStatus.knownFailureCount > 0) {
		runStatus.knownFailures.forEach(function (test) {
			output += '\n\n\n  ' + colors.error(test.title);
		});
	}

	if (runStatus.failCount > 0) {
		runStatus.tests.forEach(function (test, index) {
			if (!test.error) {
				return;
			}

			var beforeSpacing = index === 0 ? '\n\n' : '\n\n\n\n';
			output += beforeSpacing + '  ' + colors.title(test.title) + '\n';
			if (test.error.source) {
				var errorPath = path.relative(this.options.basePath, test.error.source.file) + ':' + test.error.source.line;
				output += '  ' + colors.errorSource(errorPath) + '\n\n';
				output += indentString(codeExcerpt(path.join(this.options.basePath, test.error.source.file), test.error.source.line, {maxWidth: process.stdout.columns}), 2) + '\n';
			}

			if (test.error.showOutput) {
				output += '\n' + indentString(formatAssertError(test.error), 2);
			}

			// .trim() is needed, because default err.message is ' ' (see lib/assert.js)
			if (test.error.message.trim()) {
				output += '\n' + indentString(test.error.message, 2) + '\n';
			}

			if (test.error.stack) {
				output += '\n' + indentString(colors.errorStack(extractStack(test.error.stack)), 2);
			}
		}, this);
	}

	if (runStatus.failFastEnabled === true && runStatus.remainingCount > 0 && runStatus.failCount > 0) {
		output += '\n\n\n  ' + colors.information('`--fail-fast` is on. Any number of tests may have been skipped');
	}

	if (runStatus.hasExclusive === true && runStatus.remainingCount > 0) {
		output += '\n\n\n  ' + colors.information('The .only() modifier is used in some tests.', runStatus.remainingCount, plur('test', runStatus.remainingCount), plur('was', 'were', runStatus.remainingCount), 'not run');
	}

	return output + '\n';
};

VerboseReporter.prototype.section = function () {
	return chalk.gray.dim(repeating('\u2500', process.stdout.columns || 80));
};

VerboseReporter.prototype.write = function (str) {
	console.error(str);
};

VerboseReporter.prototype.stdout = VerboseReporter.prototype.stderr = function (data) {
	process.stderr.write(data);
};
