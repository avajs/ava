'use strict';

const callsites = require('callsites');
const micromatch = require('micromatch');
const sourceMapSupport = require('source-map-support');
const flatten = require('lodash/flatten');
const parseTestSources = require('./test-ast');

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

function buildTestLineNumbersCache(filePath) {
	return new Map(parseTestSources(filePath).map(({loc: {start, end}}) => [
		// Column number is 0-based in `recast` but 1-based in `callsites`
		`${start.line}:${start.column + 1}`,
		{startLineNumber: start.line, endLineNumber: end.line}
	]));
}

exports.buildTestLineNumbersCache = buildTestLineNumbersCache;

function resolveTestPosition(filePath) {
	const callSite = callsites().find(callSite => callSite.getFileName() === filePath);
	if (!callSite) {
		throw new Error(`Failed to resolve test position in ${filePath}.`);
	}

	const sourceCallSite = sourceMapSupport.wrapCallSite(callSite);

	return {
		startLineNumber: sourceCallSite.getLineNumber(),
		startColumnNumber: sourceCallSite.getColumnNumber()
	};
}

exports.resolveTestPosition = resolveTestPosition;

function isSelectedByLineNumbers({startLineNumber, endLineNumber}, lineNumbers) {
	return lineNumbers.some(lineNumber => startLineNumber <= lineNumber && lineNumber <= endLineNumber);
}

exports.isSelectedByLineNumbers = isSelectedByLineNumbers;
