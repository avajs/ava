'use strict';
const format = require('util').format;
const indentString = require('indent-string');
const stripAnsi = require('strip-ansi');
const yaml = require('js-yaml');

function dumpError(error, includeMessage) {
	const obj = Object.assign({}, error.object);
	if (error.name) {
		obj.name = error.name;
	}
	if (includeMessage && error.message) {
		obj.message = error.message;
	}

	if (error.avaAssertionError) {
		if (error.assertion) {
			obj.assertion = error.assertion;
		}
		if (error.operator) {
			obj.operator = error.operator;
		}
		if (error.values.length > 0) {
			obj.values = error.values.reduce((acc, value) => {
				acc[value.label] = stripAnsi(value.formatted);
				return acc;
			}, {});
		}
	}

	if (error.stack) {
		obj.at = error.stack.split('\n')[0];
	}

	return `  ---\n${indentString(yaml.safeDump(obj).trim(), 4)}\n  ...`;
}

class TapReporter {
	constructor() {
		this.i = 0;
	}
	start() {
		return 'TAP version 13';
	}
	test(test) {
		const output = [];

		let directive = '';
		const passed = test.todo ? 'not ok' : 'ok';

		if (test.todo) {
			directive = '# TODO';
		} else if (test.skip) {
			directive = '# SKIP';
		}

		const title = stripAnsi(test.title);

		const appendLogs = () => {
			if (test.logs) {
				test.logs.forEach(log => {
					const logLines = indentString(log, 4);
					const logLinesWithLeadingFigure = logLines.replace(
						/^ {4}/,
						'  * '
					);

					output.push(logLinesWithLeadingFigure);
				});
			}
		};

		output.push(`# ${title}`);

		if (test.error) {
			output.push(format('not ok %d - %s', ++this.i, title));
			appendLogs();
			output.push(dumpError(test.error, true));
		} else {
			output.push(format('%s %d - %s %s', passed, ++this.i, title, directive).trim());
			appendLogs();
		}

		return output.join('\n');
	}
	unhandledError(err) {
		const output = [
			`# ${err.message}`,
			format('not ok %d - %s', ++this.i, err.message)
		];
		// AvaErrors don't have stack traces
		if (err.type !== 'exception' || err.name !== 'AvaError') {
			output.push(dumpError(err, false));
		}

		return output.join('\n');
	}
	finish(runStatus) {
		const output = [
			'',
			'1..' + (runStatus.passCount + runStatus.failCount + runStatus.skipCount),
			'# tests ' + (runStatus.passCount + runStatus.failCount + runStatus.skipCount),
			'# pass ' + runStatus.passCount
		];

		if (runStatus.skipCount > 0) {
			output.push(`# skip ${runStatus.skipCount}`);
		}

		output.push('# fail ' + (runStatus.failCount + runStatus.rejectionCount + runStatus.exceptionCount), '');

		return output.join('\n');
	}
	write(str) {
		console.log(str);
	}
	stdout(data) {
		process.stderr.write(data);
	}
	stderr(data) {
		this.stdout(data);
	}
}

module.exports = TapReporter;
