'use strict';

const callsites = require('callsites');
const micromatch = require('micromatch');
const sourceMapSupport = require('source-map-support');
const flatten = require('lodash/flatten');
const parseTestSourceInFile = require('./test-ast');

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
const range = (start, end) => new Array(end - start + 1).fill(start).map((element, index) => element + index);

const parseLineNumbers = suffix => sortNumbersAscending(distinctArray(flatten(
	suffix.split(',').map(part => {
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
	})
)));

function splitPatternAndLineNumbers(pattern) {
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

exports.splitPatternAndLineNumbers = splitPatternAndLineNumbers;

function getApplicableLineNumbers(normalizedFilePath, filter) {
	return sortNumbersAscending(distinctArray(flatten(
		filter
			.filter(({pattern, lineNumbers}) => lineNumbers !== null && micromatch.isMatch(normalizedFilePath, pattern))
			.map(({lineNumbers}) => lineNumbers)
	)));
}

exports.getApplicableLineNumbers = getApplicableLineNumbers;

const resolveEndLineNumberForTestInFile = ({startLineNumber, startColumnNumber}, filePath) => {
	try {
		const node = parseTestSourceInFile({startLineNumber, startColumnNumber}, filePath);
		return node.loc.end.line;
	} catch (error) {
		throw new Error(`Failed to resolve end line number for test starting at ${startLineNumber}:${startColumnNumber} in ${filePath}: ${error.message}`);
	}
};

function getLineNumberRangeForTestInFile(filePath) {
	const callSite = callsites().find(callSite => callSite.getFileName() === filePath);
	if (!callSite) {
		throw new Error(`Failed to resolve line number range for test in ${filePath}.`);
	}

	const sourceCallSite = sourceMapSupport.wrapCallSite(callSite);
	const startLineNumber = sourceCallSite.getLineNumber();
	const startColumnNumber = sourceCallSite.getColumnNumber();
	const endLineNumber = resolveEndLineNumberForTestInFile({startLineNumber, startColumnNumber}, filePath);

	return {startLineNumber, endLineNumber};
}

exports.getLineNumberRangeForTestInFile = getLineNumberRangeForTestInFile;

function isTestSelectedByLineNumbers({startLineNumber, endLineNumber}, lineNumbers) {
	return lineNumbers.some(lineNumber => startLineNumber <= lineNumber && lineNumber <= endLineNumber);
}

exports.isTestSelectedByLineNumbers = isTestSelectedByLineNumbers;
