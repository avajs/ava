'use strict';

const fs = require('fs');
const AST = require('recast');

exports.parseTestSourceInFile = ({startLineNumber, title}, filePath) => {
	const fileAst = AST.parse(tryReadFile(filePath));
	const candidates = [];

	AST.visit(fileAst, {
		visitCallExpression(path) {
			const {node} = path;

			if (node.loc.start.line === startLineNumber) {
				candidates.push(node);
				return false;
			}

			this.traverse(path);
		}
	});

	if (candidates.length === 0) {
		throw new Error(`No test starting at line number ${startLineNumber} in ${filePath}.`);
	}

	const testAst = candidates.find(candidate => {
		const [firstArgument] = candidate.arguments;
		return firstArgument && firstArgument.value === title;
	});

	if (!testAst) {
		throw new Error(`No test \`${title}\` starting at line number ${startLineNumber} in ${filePath}.`);
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
