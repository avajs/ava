'use strict';
const format = require('util').format;
const stripAnsi = require('strip-ansi');

// Parses stack trace and extracts original function name, file name and line
function getSourceFromStack(stack, index) {
	return stack
		.split('\n')
		.slice(index, index + 1)
		.join('')
		.replace(/^\s+ /, '');
}

class TapReporter {
	constructor() {
		this.i = 0;
	}
	start() {
		return 'TAP version 13';
	}
	test(test) {
		let output;

		let directive = '';
		const passed = test.todo ? 'not ok' : 'ok';

		if (test.todo) {
			directive = '# TODO';
		} else if (test.skip) {
			directive = '# SKIP';
		}

		const title = stripAnsi(test.title);

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
				`# ${title}`,
				format('%s %d - %s %s', passed, ++this.i, title, directive).trim()
			];
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
			output.push(
				'  ---',
				'    name: ' + err.name,
				'    at: ' + getSourceFromStack(err.stack, 1),
				'  ...'
			);
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
