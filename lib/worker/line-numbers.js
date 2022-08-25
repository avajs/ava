import * as fs from 'node:fs';
import {createRequire, findSourceMap} from 'node:module';
import {pathToFileURL} from 'node:url';

import callsites from 'callsites';

const require = createRequire(import.meta.url);

function parse(file) {
	// Avoid loading these until we actually need to select tests by line number.
	const acorn = require('acorn');
	const walk = require('acorn-walk');

	const ast = acorn.parse(fs.readFileSync(file, 'utf8'), {
		ecmaVersion: 11,
		locations: true,
		sourceType: 'module',
	});

	const locations = [];
	walk.simple(ast, {
		CallExpression(node) {
			locations.push(node.loc);
		},
	});

	// Walking is depth-first, but we want to sort these breadth-first.
	locations.sort((a, b) => {
		if (a.start.line === b.start.line) {
			return a.start.column - b.start.column;
		}

		return a.start.line - b.start.line;
	});

	return locations;
}

function findTest(locations, declaration) {
	// Find all calls that span the test declaration.
	const spans = locations.filter(loc => {
		if (loc.start.line > declaration.line || loc.end.line < declaration.line) {
			return false;
		}

		if (loc.start.line === declaration.line && loc.start.column > declaration.column) {
			return false;
		}

		if (loc.end.line === declaration.line && loc.end.column < declaration.column) {
			return false;
		}

		return true;
	});

	// Locations should be sorted by source order, so the last span must be the test.
	return spans.pop();
}

const range = (start, end) => Array.from({length: end - start + 1}).fill(start).map((element, index) => element + index);

const translate = (sourceMap, pos) => {
	if (sourceMap === null) {
		return pos;
	}

	const entry = sourceMap.findEntry(pos.line - 1, pos.column); // Source maps are 0-based

	// When used with ts-node/register, we've seen entries without original values. Return the
	// original position.
	if (entry.originalLine === undefined || entry.originalColumn === undefined) {
		return pos;
	}

	return {
		line: entry.originalLine + 1, // Readjust for Acorn.
		column: entry.originalColumn,
	};
};

export default function lineNumberSelection({file, lineNumbers = []}) {
	if (lineNumbers.length === 0) {
		return undefined;
	}

	const selected = new Set(lineNumbers);

	let locations = parse(file);
	let lookedForSourceMap = false;
	let sourceMap = null;

	return () => {
		if (!lookedForSourceMap) {
			lookedForSourceMap = true;

			// The returned function is called *after* the file has been loaded.
			// Source maps are not available before then.
			sourceMap = findSourceMap(file);

			if (sourceMap === undefined) {
				// Prior to Node.js 18.8.0, the value when a source map could not be found was `undefined`.
				// This changed to `null` in <https://github.com/nodejs/node/pull/43875>.
				sourceMap = null;
			}

			if (sourceMap !== null) {
				locations = locations.map(({start, end}) => ({
					start: translate(sourceMap, start),
					end: translate(sourceMap, end),
				}));
			}
		}

		// Assume this is called from a test declaration, which is located in the file.
		// If not… don't select the test!
		const callSite = callsites().find(callSite => {
			const current = callSite.getFileName();
			if (file.startsWith('file://')) {
				return current.startsWith('file://') ? file === current : file === pathToFileURL(current).toString();
			}

			return current.startsWith('file://') ? pathToFileURL(file).toString() === current : file === current;
		});
		if (!callSite) {
			return false;
		}

		const start = translate(sourceMap, {
			line: callSite.getLineNumber(), // 1-based
			column: callSite.getColumnNumber() - 1, // Comes out as 1-based, Acorn wants 0-based
		});

		const test = findTest(locations, start);
		if (!test) {
			return false;
		}

		return range(test.start.line, test.end.line).some(line => selected.has(line));
	};
}
