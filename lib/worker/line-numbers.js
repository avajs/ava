function parse(file) {
	const fs = require('fs');
	const acorn = require('acorn');
	const walk = require('acorn-walk');

	const ast = acorn.parse(fs.readFileSync(file, 'utf8'), {
		ecmaVersion: 11,
		locations: true
	});

	const locations = [];
	walk.simple(ast, {
		CallExpression(node) {
			locations.push(node.loc);
		}
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

const range = (start, end) => new Array(end - start + 1).fill(start).map((element, index) => element + index);

module.exports = ({file, lineNumbers = []}) => {
	if (lineNumbers.length === 0) {
		return undefined;
	}

	// Avoid loading these until we actually need to select tests by line number.
	const callsites = require('callsites');
	const sourceMapSupport = require('source-map-support');

	const locations = parse(file);
	const selected = new Set(lineNumbers);

	return () => {
		// Assume this is called from a test declaration, which is located in the file.
		// If not… don't select the test!
		const callSite = callsites().find(callSite => callSite.getFileName() === file);
		if (!callSite) {
			return false;
		}

		// FIXME: This assumes the callSite hasn't already been adjusted. It's likely
		// that if `source-map-support/register` has been loaded, this would result
		// in the wrong location.
		const sourceCallSite = sourceMapSupport.wrapCallSite(callSite);
		const start = {
			line: sourceCallSite.getLineNumber(),
			column: sourceCallSite.getColumnNumber() - 1 // Use 0-indexed columns.
		};

		const test = findTest(locations, start);
		if (!test) {
			return false;
		}

		return range(test.start.line, test.end.line).some(line => selected.has(line));
	};
};
