'use strict';

const callsites = require('callsites');
const micromatch = require('micromatch');
const sourceMapSupport = require('source-map-support');
const flatten = require('lodash/flatten');
const parseTestSourceInFile = require('./test-ast');

const NUMBER_REGEX = /^-?\d+$/;
const RANGE_REGEX = /^(?<startGroup>-?\d+)-(?<endGroup>-?\d+)$/;
const LINE_NUMBERS_REGEX = /^(?:-?\d+(?:--?\d+)?,?)+$/;
const DELIMITER = ':';

const pluralizeIf = (string, condition) => condition ? `${string}s` : string;

class FormatError extends Error {
	constructor(offender) {
		const numberPluralized = pluralizeIf('number', offender && !NUMBER_REGEX.test(offender) && offender.length !== 1);
		super(`Invalid line ${numberPluralized}: \`${offender}\`. Expected comma-separated list of \`[X|Y-Z]\`.`);
		this.name = 'FormatError';
	}
}

const distinctArray = array => [...new Set(array)];
const sortNumbersAscending = array => {
	const sorted = [...array];
	sorted.sort((a, b) => a - b);
	return sorted;
};

const parseNumber = string => parseInt(string, 10);
const removeAllWhitespace = string => string.replace(/\s/g, '');
const range = (start, end) => new Array(end - start + 1).fill(start).map((element, index) => element + index);

const parseLineNumbers = suffix => sortNumbersAscending(distinctArray(flatten(suffix.split(',').map(part => {
	if (NUMBER_REGEX.test(part)) {
		const number = parseNumber(part);
		if (number <= 0) {
			throw new Error(`Invalid line number: \`${part}\`. Line numbers must be positive.`);
		}

		return number;
	}

	const match = RANGE_REGEX.exec(part);
	if (match) {
		const {startGroup, endGroup} = match.groups;
		const start = parseNumber(startGroup);
		const end = parseNumber(endGroup);
		if (start < 0 || end < 0) {
			throw new Error(`Invalid line number range: \`${part}\`. Line numbers must be positive.`);
		}

		if (start > end) {
			throw new Error(`Invalid line number range: \`${part}\`. \`start\` must be less than \`end\`.`);
		}

		return range(start, end);
	}

	throw new FormatError(part);
}))));

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
			.filter(({pattern}) => micromatch.isMatch(normalizedFilePath, pattern))
			.map(({lineNumbers}) => lineNumbers)
	)));
}

exports.getApplicableLineNumbers = getApplicableLineNumbers;

const resolveEndLineNumberForTestInFile = ({title, startLineNumber}, filePath) => {
	try {
		const node = parseTestSourceInFile({title, startLineNumber}, filePath);
		return node.loc.end.line;
	} catch (error) {
		throw new Error(`Failed to resolve end line number for test \`${title}\` starting at line number ${startLineNumber} in ${filePath}: ${error.message}`);
	}
};

function getLineNumberRangeForTestInFile(title, filePath) {
	const callSite = callsites().find(callSite => callSite.getFileName() === filePath);
	if (!callSite) {
		throw new Error(`Failed to resolve line number range for test \`${title}\` in ${filePath}.`);
	}

	const sourceCallSite = sourceMapSupport.wrapCallSite(callSite);
	const startLineNumber = sourceCallSite.getLineNumber();
	const endLineNumber = resolveEndLineNumberForTestInFile({startLineNumber, title}, filePath);

	return {startLineNumber, endLineNumber};
}

exports.getLineNumberRangeForTestInFile = getLineNumberRangeForTestInFile;

function isTestSelectedByLineNumbers({startLineNumber, endLineNumber}, lineNumbers) {
	return lineNumbers.some(lineNumber => startLineNumber <= lineNumber && lineNumber <= endLineNumber);
}

exports.isTestSelectedByLineNumbers = isTestSelectedByLineNumbers;
