'use strict';

const callsites = require('callsites');
const micromatch = require('micromatch');
const sourceMapSupport = require('source-map-support');
const flatten = require('lodash/flatten');
const parseTestSourceInFile = require('./test-ast');

const NUMBER_REGEX = /^-?\d+$/;
const RANGE_REGEX = /^(?<startGroup>-?\d+)-(?<endGroup>-?\d+)$/;
const LINE_NUMBERS_REGEX = /^(?:-?\d+(?:-\d+)?,?)+$/;
const DELIMITER = ':';

const pluralizeIf = (string, condition) => condition ? `${string}s` : string;

class FormatError extends Error {
	constructor(offender) {
		const numberPluralized = pluralizeIf('number', offender && !NUMBER_REGEX.test(offender) && offender.length !== 1);
		super(`Invalid line ${numberPluralized}: \`${offender}\`. Expected comma-separated list of \`[X|Y-Z]\`.`);
		this.name = 'FormatError';
	}
}

const parseNumber = string => parseInt(string, 10);
const removeAllWhitespace = string => string.replace(/\s/g, '');

const parseLineNumbers = suffix => {
	const retval = [];
	for (const string of suffix.split(',')) {
		const trimmed = removeAllWhitespace(string);

		if (NUMBER_REGEX.test(trimmed)) {
			const number = parseNumber(trimmed);
			if (number <= 0) {
				throw new Error(`Invalid line number: \`${trimmed}\`. Line numbers must be positive.`);
			}

			retval.push(number);
			continue;
		}

		const match = RANGE_REGEX.exec(trimmed);
		if (match) {
			const {startGroup, endGroup} = match.groups;
			const start = parseNumber(startGroup);
			const end = parseNumber(endGroup);
			if (start < 0 || end < 0) {
				throw new Error(`Invalid line number range: \`${trimmed}\`. Line numbers must be positive.`);
			}

			if (start > end) {
				throw new Error(`Invalid line number range: \`${trimmed}\`. \`start\` must be lesser than \`end\`.`);
			}

			for (let i = start; i <= end; i++) {
				retval.push(i);
			}

			continue;
		}

		throw new FormatError(string);
	}

	return retval;
};

function splitPatternAndLineNumbers(value) {
	const parts = value.split(DELIMITER);
	if (parts.length === 1) {
		return {pattern: parts[0], lineNumbers: null};
	}

	const suffix = parts.pop();
	const pattern = parts.join(DELIMITER);

	if (!LINE_NUMBERS_REGEX.test(suffix)) {
		return {pattern, lineNumbers: null};
	}

	return {pattern, lineNumbers: parseLineNumbers(suffix)};
}

exports.splitPatternAndLineNumbers = splitPatternAndLineNumbers;

const distinctArray = array => [...new Set(array)];
const sortNumbersAscending = array => {
	const sorted = [...array];
	sorted.sort((a, b) => a - b);
	return sorted;
};

function getApplicableLineNumbers(normalizedFilePath, filter) {
	return sortNumbersAscending(distinctArray(flatten(
		filter
			.filter(({pattern}) => micromatch.isMatch(normalizedFilePath, pattern))
			.map(({lineNumbers}) => lineNumbers)
	)));
}

exports.getApplicableLineNumbers = getApplicableLineNumbers;

const resolveEndLineNumberForTestInFile = (test, filePath) => {
	try {
		const node = parseTestSourceInFile(test, filePath);
		return node.loc.end.line;
	} catch (error) {
		const {title, startLineNumber} = test || {};
		throw new Error(`Failed to resolve end line number for test \`${title}\` starting at line number ${startLineNumber} in ${filePath}: ${error.message}`);
	}
};

function getLineNumberRangeForTestInFile(title, filePath) {
	const callSite = callsites().find(callSite => callSite.getFileName() === filePath);

	if (!callSite) {
		throw new Error(`Failed to resolve line number range for test in ${filePath}: Test never called.`);
	}

	const sourceCallSite = sourceMapSupport.wrapCallSite(callSite);
	const startLineNumber = sourceCallSite.getLineNumber();
	const endLineNumber = resolveEndLineNumberForTestInFile({startLineNumber, title}, filePath);

	return {startLineNumber, endLineNumber};
}

exports.getLineNumberRangeForTestInFile = getLineNumberRangeForTestInFile;

function isTestSelectedByLineNumbers(testLineNumberRange, lineNumbers) {
	if (!testLineNumberRange) {
		return false;
	}

	const {startLineNumber, endLineNumber} = testLineNumberRange;
	return lineNumbers.some(lineNumber => startLineNumber <= lineNumber && lineNumber <= endLineNumber);
}

exports.isTestSelectedByLineNumbers = isTestSelectedByLineNumbers;
