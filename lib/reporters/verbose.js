'use strict';
const indentString = require('indent-string');
const prettyMs = require('pretty-ms');
const figures = require('figures');
const chalk = require('chalk');
const plur = require('plur');
const trimOffNewlines = require('trim-off-newlines');
const codeExcerpt = require('../code-excerpt');
const colors = require('../colors');
const formatSerializedError = require('./format-serialized-error');
const improperUsageMessages = require('./improper-usage-messages');

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
		const lines = [];
		if (test.error) {
			lines.push('  ' + colors.error(figures.cross) + ' ' + test.title + ' ' + colors.error(test.error.message));
		} else if (test.todo) {
			lines.push('  ' + colors.todo('- ' + test.title));
		} else if (test.skip) {
			lines.push('  ' + colors.skip('- ' + test.title));
		} else if (test.failing) {
			lines.push('  ' + colors.error(figures.tick) + ' ' + colors.error(test.title));
		} else if (runStatus.fileCount === 1 && runStatus.testCount === 1 && test.title === '[anonymous]') {
			// No output
		} else {
			// Display duration only over a threshold
			const threshold = 100;
			const duration = test.duration > threshold ? colors.duration(' (' + prettyMs(test.duration) + ')') : '';

			lines.push('  ' + colors.pass(figures.tick) + ' ' + test.title + duration);
		}

		if (test.logs) {
			test.logs.forEach(log => {
				const logLines = indentString(colors.log(log), 6);
				const logLinesWithLeadingFigure = logLines.replace(
					/^ {6}/,
					`    ${colors.information(figures.info)} `
				);

				lines.push(logLinesWithLeadingFigure);
			});
		}

		return lines.length > 0 ? lines.join('\n') : undefined;
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
			output += '  ' + colors.stack(err.title || err.summary) + '\n';
			output += '  ' + colors.stack(err.stack) + '\n';
		} else {
			output += '  ' + colors.stack(JSON.stringify(err)) + '\n';
		}

		output += '\n';

		return output;
	}
	finish(runStatus) {
		let output = '';

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
			if (this.options.watching) {
				lines[0] += ' ' + chalk.gray.dim('[' + new Date().toLocaleTimeString('en-US', {hour12: false}) + ']');
			}
			output += lines.join('\n') + '\n';
		}

		if (runStatus.knownFailureCount > 0) {
			runStatus.knownFailures.forEach(test => {
				output += '\n\n  ' + colors.error(test.title) + '\n';
			});
		}

		output += '\n';
		if (runStatus.failCount > 0) {
			runStatus.tests.forEach(test => {
				if (!test.error) {
					return;
				}

				output += '  ' + colors.title(test.title) + '\n';

				if (test.logs) {
					test.logs.forEach(log => {
						const logLines = indentString(colors.log(log), 6);
						const logLinesWithLeadingFigure = logLines.replace(
							/^ {6}/,
							`    ${colors.information(figures.info)} `
						);

						output += logLinesWithLeadingFigure + '\n';
					});

					output += '\n';
				}

				if (test.error.source) {
					output += '  ' + colors.errorSource(test.error.source.file + ':' + test.error.source.line) + '\n';

					const excerpt = codeExcerpt(test.error.source, {maxWidth: process.stdout.columns});
					if (excerpt) {
						output += '\n' + indentString(excerpt, 2) + '\n';
					}
				}

				if (test.error.avaAssertionError) {
					const result = formatSerializedError(test.error);
					if (result.printMessage) {
						output += '\n' + indentString(test.error.message, 2) + '\n';
					}

					if (result.formatted) {
						output += '\n' + indentString(result.formatted, 2) + '\n';
					}

					const message = improperUsageMessages.forError(test.error);
					if (message) {
						output += '\n' + indentString(message, 2) + '\n';
					}
				} else if (test.error.message) {
					output += '\n' + indentString(test.error.message, 2) + '\n';
				}

				if (test.error.stack) {
					const stack = test.error.stack;
					if (stack.includes('\n')) {
						output += '\n' + indentString(colors.errorStack(stack), 2) + '\n';
					}
				}

				output += '\n\n\n';
			});
		}

		if (runStatus.failFastEnabled === true && runStatus.remainingCount > 0 && runStatus.failCount > 0) {
			const remaining = 'At least ' + runStatus.remainingCount + ' ' + plur('test was', 'tests were', runStatus.remainingCount) + ' skipped.';
			output += '  ' + colors.information('`--fail-fast` is on. ' + remaining) + '\n\n';
		}

		if (runStatus.hasExclusive === true && runStatus.remainingCount > 0) {
			output += '  ' + colors.information('The .only() modifier is used in some tests.', runStatus.remainingCount, plur('test', runStatus.remainingCount), plur('was', 'were', runStatus.remainingCount), 'not run');
		}

		return '\n' + trimOffNewlines(output) + '\n';
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
