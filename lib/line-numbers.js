'use strict';

const callsites = require('callsites');
const micromatch = require('micromatch');
const sourceMapSupport = require('source-map-support');
const flatten = require('lodash/flatten');

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
			.filter(({pattern, lineNumbers}) => lineNumbers && micromatch.isMatch(normalizedFilePath, pattern))
			.map(({lineNumbers}) => lineNumbers)
	)));
}

exports.getApplicableLineNumbers = getApplicableLineNumbers;

const isTestSelectedByLineNumbers = ({lineNumbers, allCallLocations, file}) => {
	const selectedLines = new Set(lineNumbers);

	// Assume this is called from a test declaration, which is located in the file.
	// If not… don't select the test!
	const callSite = callsites().find(callSite => callSite.getFileName() === file);
	if (!callSite) {
		return false;
	}

	const sourceCallSite = sourceMapSupport.wrapCallSite(callSite);
	const start = {
		line: sourceCallSite.getLineNumber(),
		column: sourceCallSite.getColumnNumber() - 1 // Use 0-indexed columns.
	};

	// Find all calls that close over the test declaration.
	const enclosingCalls = allCallLocations.filter(loc => {
		if (loc.start.line > start.line || loc.end.line < start.line) {
			return false;
		}

		if (loc.start.line === start.line && loc.start.column > start.column) {
			return false;
		}

		if (loc.end.line === start.line && loc.end.column < start.column) {
			return false;
		}

		return true;
	});

	if (enclosingCalls.length === 0) {
		return false;
	}

	// Call locations should be sorted by source order, so the last enclosing
	// call must be the test declaration.
	const test = enclosingCalls.pop();
	return range(test.start.line, test.end.line).some(line => selectedLines.has(line));
};

function initializeLineNumberSelector(file, lineNumbers = []) {
	if (lineNumbers.length === 0) {
		return undefined;
	}

	// Load lazily, just in the worker processes.
	const fs = require('fs');
	const recast = require('recast');

	// Fail silently if the file is missing (which would be really surprising)
	// or can't be parsed, perhaps because it's a TypeScript file.
	let ast;
	try {
		ast = recast.parse(fs.readFileSync(file, 'utf8'));
	} catch {
		return undefined;
	}

	const allCallLocations = [];
	recast.visit(ast, {
		visitCallExpression(path) {
			const {start, end} = path.node.loc;
			allCallLocations.push({start, end});
			this.traverse(path);
		}
	});

	return {
		isSelected: () => isTestSelectedByLineNumbers({lineNumbers, allCallLocations, file})
	};
}

exports.initializeLineNumberSelector = initializeLineNumberSelector;
