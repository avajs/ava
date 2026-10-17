import picomatch from 'picomatch';

const NUMBER_REGEX = /^\d+$/;
const RANGE_REGEX = /^(?<startGroup>\d+)-(?<endGroup>\d+)$/;
const LINE_NUMBERS_REGEX = /^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/;
const DELIMITER = ':';

const distinctArray = array => [...new Set(array)];
const sortNumbersAscending = array => {
	const sorted = [...array];
	sorted.sort((a, b) => a - b);
	return sorted;
};

const parseNumber = Number;
const removeAllWhitespace = string => string.replaceAll(/\s/g, '');
const range = (start, end) => Array.from({length: end - start + 1}, (_, index) => start + index);

const parseLineNumbers = suffix => sortNumbersAscending(distinctArray(suffix.split(',').flatMap(part => {
	if (NUMBER_REGEX.test(part)) {
		return parseNumber(part);
	}

	const {groups: {startGroup, endGroup}} = RANGE_REGEX.exec(part);
	const start = parseNumber(startGroup);
	const end = parseNumber(endGroup);

	return start > end ? range(end, start) : range(start, end);
})));

export function splitPatternAndLineNumbers(pattern) {
	const parts = pattern.split(DELIMITER);
	if (parts.length === 1) {
		return {pattern, lineNumbers: null};
	}

	const suffix = removeAllWhitespace(parts.pop());
	return LINE_NUMBERS_REGEX.test(suffix) ? {pattern: parts.join(DELIMITER), lineNumbers: parseLineNumbers(suffix)} : {pattern, lineNumbers: null};
}

export function getApplicableLineNumbers(normalizedFilePath, filter) {
	return sortNumbersAscending(distinctArray(filter
		.filter(({pattern, lineNumbers}) => lineNumbers && picomatch.isMatch(normalizedFilePath, pattern))
		.flatMap(({lineNumbers}) => lineNumbers)));
}
