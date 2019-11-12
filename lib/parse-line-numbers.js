const NUMBER_REGEX = /^-?\d+$/;
const RANGE_REGEX = /^(?<start>\d+)-(?<end>\d+)$/;

const parseNumber = string => parseInt(string, 10);
const range = (start, end) => Array(end - start + 1).fill(start).map((e, i) => e + i);
const distinctArray = array => [...new Set(array)];
const removeAllWhitespace = string => string.replace(/\s/g, "");
const pluralizeIf = (string, condition) => condition ? `${string}s` : string;
const sortNumbersAscending = array => {
  const sorted = [...array];
  sorted.sort((a, b) => a - b);
  return sorted;
};

class FormatError extends Error {
  constructor(offender) {
    const numberPluralized = pluralizeIf('number', offender && !NUMBER_REGEX.test(offender) && offender.length !== 1);
    super(`Invalid line ${numberPluralized}: \`${offender}\`. Expected comma-separated list of \`[X|Y-Z]\`.`);
    this.name = `FormatError`;
  }
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

  if (match = RANGE_REGEX.exec(trimmed)) {
    const { start, end } = Object.fromEntries(Object.entries(match.groups).map(([k, v]) => [k, parseNumber(v)]));
    if (start > end) {
      throw new Error(`Invalid line number range: \`${trimmed}\`. \`start\` must be lesser than \`end\`.`);
    }
    return range(start, end);
  }

  throw new FormatError(string);
}

function parseLineNumbers(string) {
  if (!string) {
    throw new FormatError(string);
  }

  const parts = string.split(',');
  const lineNumbers = parts.map(parsePart).flat();
  return sortNumbersAscending(distinctArray(lineNumbers));
}

module.exports = parseLineNumbers;