'use strict';
const rangeParser = require('parse-numeric-range');

function parseFileSelections(files) {
	const ranges = new Map();
	const ignored = [];
	const filenames = [];

	for (const file of files) {
		const [actualFilename, lines] = parseFileSelection(file);

		if (!ranges.has(actualFilename)) {
			ranges.set(actualFilename, []);
			filenames.push(actualFilename);
		}

		if (lines.length === 0 && ranges.get(actualFilename).length > 0) {
			ignored.push(file);
			continue;
		}

		ranges.set(actualFilename, ranges.get(actualFilename).concat(lines));
	}

	for (const file of filenames) {
		ranges.set(file, [...new Set(ranges.get(file))]);
	}

	return {
		filenames,
		ranges,
		ignored: [...new Set(ignored)]
	};
}

exports.parseFileSelections = parseFileSelections;

const rangeRegExp = /^(\d+(-\d+)?,?)+$/;

function parseFileSelection(file) {
	const colonIndex = file.lastIndexOf(':');
	const mightHaveRange = colonIndex > -1 && file[colonIndex + 1] !== '\\';
	const rangeStr = file.slice(colonIndex + 1);
	const actualFilename = file.slice(0, colonIndex);

	if (mightHaveRange && rangeRegExp.test(rangeStr)) {
		return [actualFilename, rangeParser.parse(rangeStr)];
	}

	return [file, []];
}

exports.parseFileSelection = parseFileSelection;
