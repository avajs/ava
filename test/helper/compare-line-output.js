'use strict';
var SKIP_UNTIL_EMPTY_LINE = {};

function compareLineOutput(t, actual, lineExpectations) {
	var actualLines = actual.split('\n');

	var expectationIndex = 0;
	var lineIndex = 0;
	while (lineIndex < actualLines.length && expectationIndex < lineExpectations.length) {
		var line = actualLines[lineIndex++];
		var expected = lineExpectations[expectationIndex++];
		if (expected === SKIP_UNTIL_EMPTY_LINE) {
			lineIndex = actualLines.indexOf('', lineIndex);
			continue;
		}

		if (typeof expected === 'string') {
			// Assertion titles use 1-based line indexes
			t.is(line, expected, 'line ' + lineIndex + ' ≪' + line + '≫ is ≪' + expected + '≫');
		} else {
			t.match(line, expected, 'line ' + lineIndex + ' ≪' + line + '≫ matches ' + expected);
		}
	}
}

module.exports = compareLineOutput;
compareLineOutput.SKIP_UNTIL_EMPTY_LINE = SKIP_UNTIL_EMPTY_LINE;
