'use strict';
const indentString = require('indent-string');
const prettyMs = require('pretty-ms');
const figures = require('figures');
const chalk = require('chalk');
const plur = require('plur');
const formatAssertError = require('../format-assert-error');
const extractStack = require('../extract-stack');
const codeExcerpt = require('../code-excerpt');
const colors = require('../colors');

class VerboseReporter {
	constructor(options) {
		this.options = Object.assign({}, options);

		chalk.enabled = this.options.color;
		for (const key of Object.keys(colors)) {
			colors[key].enabled = this.options.color;
		}
	}
	start() {
		return '';
	}
	test(test, runStatus) {
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
		const threshold = 100;
		const duration = test.duration > threshold ? colors.duration(' (' + prettyMs(test.duration) + ')') : '';

		return '  ' + colors.pass(figures.tick) + ' ' + test.title + duration;
	}
	unhandledError(err) {
		if (err.type === 'exception' && err.name === 'AvaError') {
			return colors.error('  ' + figures.cross + ' ' + err.message);
		}

		const types = {
			rejection: 'Unhandled Rejection',
			exception: 'Uncaught Exception'
		};

		let output = colors.error(types[err.type] + ':', err.file) + '\n';

		if (err.stack) {
			output += '  ' + colors.stack(err.stack) + '\n';
		} else {
			output += '  ' + colors.stack(JSON.stringify(err)) + '\n';
		}

		output += '\n';

		return output;
	}
	finish(runStatus) {
		let output = '\n';

		const lines = [
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
			runStatus.knownFailures.forEach(test => {
				output += '\n\n\n  ' + colors.error(test.title);
			});
		}

		if (runStatus.failCount > 0) {
			runStatus.tests.forEach((test, index) => {
				if (!test.error) {
					return;
				}

				const beforeSpacing = index === 0 ? '\n\n' : '\n\n\n\n';
				output += beforeSpacing + '  ' + colors.title(test.title) + '\n';
				if (test.error.source) {
					output += '  ' + colors.errorSource(test.error.source.file + ':' + test.error.source.line) + '\n';

					const excerpt = codeExcerpt(test.error.source, {maxWidth: process.stdout.columns});
					if (excerpt) {
						output += '\n' + indentString(excerpt, 2) + '\n';
					}
				}

				if (test.error.showOutput) {
					output += '\n' + indentString(formatAssertError(test.error), 2);
				}

				// `.trim()` is needed, because default `err.message` is ' ' (see lib/assert.js)
				if (test.error.message.trim()) {
					output += '\n' + indentString(test.error.message, 2) + '\n';
				}

				if (test.error.stack) {
					const extracted = extractStack(test.error.stack);
					if (extracted.includes('\n')) {
						output += '\n' + indentString(colors.errorStack(extracted), 2);
					}
				}
			});
		}

		if (runStatus.failFastEnabled === true && runStatus.remainingCount > 0 && runStatus.failCount > 0) {
			const remaining = 'At least ' + runStatus.remainingCount + ' ' + plur('test was', 'tests were', runStatus.remainingCount) + ' skipped.';
			output += '\n\n\n  ' + colors.information('`--fail-fast` is on. ' + remaining);
		}

		if (runStatus.hasExclusive === true && runStatus.remainingCount > 0) {
			output += '\n\n\n  ' + colors.information('The .only() modifier is used in some tests.', runStatus.remainingCount, plur('test', runStatus.remainingCount), plur('was', 'were', runStatus.remainingCount), 'not run');
		}

		return output + '\n';
	}
	section() {
		return chalk.gray.dim('\u2500'.repeat(process.stdout.columns || 80));
	}
	write(str) {
		console.error(str);
	}
	stdout(data) {
		process.stderr.write(data);
	}
	stderr(data) {
		process.stderr.write(data);
	}
}

module.exports = VerboseReporter;
