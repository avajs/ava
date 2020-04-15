'use strict';

const fs = require('fs');
const AST = require('recast');

module.exports = ({startLineNumber, startColumnNumber = 1}, filePath) => {
	const fileAst = AST.parse(tryReadFile(filePath));
	let testAst;

	AST.visit(fileAst, {
		visitCallExpression(path) {
			const node = path.node.callee.type === 'MemberExpression' ? path.node.callee.property : path.node;
			const {loc: {start}} = node;

			// Column number is 0-based in `recast` but 1-based in `callsites`
			if (start.line === startLineNumber && (start.column + 1) === startColumnNumber) {
				testAst = node;
				return false;
			}

			this.traverse(path);
		}
	});

	if (!testAst) {
		throw new Error(`No test at ${startLineNumber}:${startColumnNumber} in ${filePath}.`);
	}

	return testAst;
};

function tryReadFile(filePath) {
	try {
		const stats = fs.statSync(filePath);
		if (!stats.isFile()) {
			throw new TypeError(`${filePath} is not a file.`);
		}

		return fs.readFileSync(filePath, 'utf-8');
	} catch (error) {
		if (error.code === 'ENOENT') {
			throw new Error(`File ${filePath} not found.`);
		}

		throw new Error(`Error accessing ${filePath}: ${error.message}`);
	}
}
