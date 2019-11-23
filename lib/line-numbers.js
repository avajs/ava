'use strict';

const callsites = require('callsites');
const sourceMapSupport = require('source-map-support');
const parseTestSourceInFile = require('./test-ast');

module.exports = {
  parseLineNumbers,
  parseLineNumbersInPath,
  parseLineNumbersInPaths,
  hasLineNumbersSuffix,
  stripLineNumbersSuffix,
  resolveEndLineNumberForTestInFile,
  getLineNumberRangeForTestInFile,
  isTestSelectedByLineNumbers
};

const NUMBER_REGEX = /^-?\d+$/;
const RANGE_REGEX = /^(?<start>-?\d+)-(?<end>-?\d+)$/;
const LINE_NUMBERS_REGEX = /^(-?\d+(-\d+)?,?)+$/
const PATH_DELIMITER = ':';

const parseNumber = string => parseInt(string, 10);
const range = (start, end) => Array(end - start + 1).fill(start).map((e, i) => e + i);
const distinctArray = array => [...new Set(array)];
const removeAllWhitespace = string => string.replace(/\s/g, "");
const pluralizeIf = (string, condition) => condition ? `${string}s` : string;
const getLineNumbersSuffix = path => path.split(PATH_DELIMITER).pop();
const sortNumbersAscending = array => {
  const sorted = [...array];
  sorted.sort((a, b) => a - b);
  return sorted;
};

function parseLineNumbers(string) {
  if (!string) {
    throw new FormatError(string);
  }

  const parts = string.split(',');
  const lineNumbers = parts.map(parsePart).flat();
  return sortNumbersAscending(distinctArray(lineNumbers));
}

function parseLineNumbersInPath(path) {
  return parseLineNumbers(getLineNumbersSuffix(path));
}

function parseLineNumbersInPaths(paths) {
  const lineNumbers = {};

  for (const path of paths) {
    if (hasLineNumbersSuffix(path)) {
      const pathWithoutLineNumbers = stripLineNumbersSuffix(path);
      lineNumbers[pathWithoutLineNumbers] = sortNumbersAscending(distinctArray([
        ...(lineNumbers[pathWithoutLineNumbers] || []),
        ...parseLineNumbersInPath(path)
      ]));
    }
  }

  return lineNumbers;
}

function hasLineNumbersSuffix(path) {
  return LINE_NUMBERS_REGEX.test(getLineNumbersSuffix(path));
}

function stripLineNumbersSuffix(path) {
  return hasLineNumbersSuffix(path)
    ? path.replace(`${PATH_DELIMITER}${getLineNumbersSuffix(path)}`, '')
    : path;
}

function resolveEndLineNumberForTestInFile({startLineNumber, title} = {}, filePath) {
  try {
    const node = parseTestSourceInFile({startLineNumber, title}, filePath);
    return node.loc.end.line;
  } catch (error) {
    throw new Error(
      `Failed to resolve end line number for test \`${title}\` starting at line number ${startLineNumber} in ${filePath}: ` +
      error.message
    );
  }
}

function getLineNumberRangeForTestInFile(title, filePath, {callSites = callsites()} = {}) {
  const callSite = callSites.find(callSite => callSite.getFileName() === filePath);

  if (!callSite) {
    throw new Error(`Failed to resolve line number range for test in ${filePath}: Test never called.`)
  }

  const sourceCallSite = sourceMapSupport.wrapCallSite(callSite);
  const startLineNumber = sourceCallSite.getLineNumber();
  const endLineNumber = resolveEndLineNumberForTestInFile({startLineNumber, title}, filePath);

  return {startLineNumber, endLineNumber};
}

function isTestSelectedByLineNumbers(testLineNumberRange = {}, selectedLineNumbers) {
  const startLineNumber = parseNumber(testLineNumberRange.startLineNumber);
  const endLineNumber = parseNumber(testLineNumberRange.endLineNumber);
  if (!Number.isInteger(startLineNumber) || !Number.isInteger(endLineNumber)) {
    const {startLineNumber: start, endLineNumber: end} = testLineNumberRange;
    throw new TypeError(`Invalid test line number range ${start}-${end}: Must be integers.`)
  }
  if (!selectedLineNumbers || !Array.isArray(selectedLineNumbers) || selectedLineNumbers.length === 0) {
    throw new TypeError('Selected line numbers must be non-empty array.')
  }

  return selectedLineNumbers.some(lineNumber => startLineNumber <= lineNumber && lineNumber <= endLineNumber);
}

function parsePart(string) {
  const trimmed = removeAllWhitespace(string);

  if (NUMBER_REGEX.test(trimmed)) {
    const number = parseNumber(trimmed);
    if (number <= 0) {
      throw new Error(`Invalid line number: \`${trimmed}\`. Line numbers must be positive.`);
    }
    return number;
  }

  const match = RANGE_REGEX.exec(trimmed);
  if (match) {
    const {start, end} = Object.fromEntries(Object.entries(match.groups).map(([k, v]) => [k, parseNumber(v)]));
    if (start < 0 || end < 0) {
      throw new Error(`Invalid line number range: \`${trimmed}\`. Line numbers must be positive.`);
    }
    if (start > end) {
      throw new Error(`Invalid line number range: \`${trimmed}\`. \`start\` must be lesser than \`end\`.`);
    }
    return range(start, end);
  }

  throw new FormatError(string);
}

class FormatError extends Error {
  constructor(offender) {
    const numberPluralized = pluralizeIf('number', offender && !NUMBER_REGEX.test(offender) && offender.length !== 1);
    super(`Invalid line ${numberPluralized}: \`${offender}\`. Expected comma-separated list of \`[X|Y-Z]\`.`);
    this.name = 'FormatError';
  }
}
