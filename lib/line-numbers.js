import picomatch from 'picomatch';

const NUMBER_REGEX = /^\d+$/;
const RANGE_REGEX = /^(?<startGroup>\d+)-(?<endGroup>\d+)$/;
const LINE_NUMBERS_REGEX = /^(?:\d+(?:-\d+)?,?)+$/;
const DELIMITER = ':';

const distinctArray = array => [...new Set(array)];
const sortNumbersAscending = array => {
	const sorted = [...array];
	sorted.sort((a, b) => a - b);
	return sorted;
};

const parseNumber = string => Number.parseInt(string, 10);
const removeAllWhitespace = string => string.replace(/\s/g, '');
const range = (start, end) => Array.from({length: end - start + 1}).fill(start).map((element, index) => element + index);

const parseLineNumbers = suffix => sortNumbersAscending(distinctArray(
	suffix.split(',').flatMap(part => {
		if (NUMBER_REGEX.test(part)) {
			return parseNumber(part);
		}

		const {groups: {startGroup, endGroup}} = RANGE_REGEX.exec(part);
		const start = parseNumber(startGroup);
		const end = parseNumber(endGroup);

		if (start > end) {
			return range(end, start);
		}

		return range(start, end);
	}),
));

export function splitPatternAndLineNumbers(pattern) {
	const parts = pattern.split(DELIMITER);
	if (parts.length === 1) {
		return {pattern, lineNumbers: null};
	}

	const suffix = removeAllWhitespace(parts.pop());
	if (!LINE_NUMBERS_REGEX.test(suffix)) {
		return {pattern, lineNumbers: null};
	}

	return {pattern: parts.join(DELIMITER), lineNumbers: parseLineNumbers(suffix)};
}

export function getApplicableLineNumbers(normalizedFilePath, filter) {
	return sortNumbersAscending(distinctArray(
		filter
			.filter(({pattern, lineNumbers}) => lineNumbers && picomatch.isMatch(normalizedFilePath, pattern))
			.flatMap(({lineNumbers}) => lineNumbers),
	));
}
