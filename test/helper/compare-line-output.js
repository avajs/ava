'use strict';
const SKIP_UNTIL_EMPTY_LINE = Symbol('SKIP_UNTIL_EMPTY_LINE');

function compareLineOutput(t, actual, lineExpectations) {
	const actualLines = actual.split('\n');
	let expectationIndex = 0;
	let lineIndex = 0;

	while (lineIndex < actualLines.length && expectationIndex < lineExpectations.length) {
		const line = actualLines[lineIndex++];
		const expected = lineExpectations[expectationIndex++];

		if (expected === SKIP_UNTIL_EMPTY_LINE) {
			lineIndex = actualLines.indexOf('', lineIndex);
			continue;
		}

		if (typeof expected === 'string') {
			// Assertion titles use 1-based line indexes
			t.is(line, expected, `line ${lineIndex} ≪${line}≫ is ≪${expected}≫`);
		} else {
			t.match(line, expected, `line ${lineIndex} ≪${line}≫ matches ${expected}`);
		}
	}

	t.is(lineIndex, actualLines.length, `Compared ${lineIndex} of ${actualLines.length} lines`);
}

module.exports = compareLineOutput;
compareLineOutput.SKIP_UNTIL_EMPTY_LINE = SKIP_UNTIL_EMPTY_LINE;
