'use strict';

const fs = require('fs');
const AST = require('recast');
const mem = require('mem');

const tryReadFile = mem(filePath => {
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
});

const parseFile = mem(filePath => AST.parse(tryReadFile(filePath)));

module.exports = filePath => {
	const testAsts = [];

	AST.visit(parseFile(filePath), {
		visitCallExpression(path) {
			const {node} = path;
			if (node.callee.type === 'MemberExpression') {
				// `recast` counts the object location (e.g. `_t_est`),
				// but we're interested in the property location (e.g. `test._s_erial`)
				// as that is what `callsites` reports
				node.loc = node.callee.property.loc;
			}

			testAsts.push(node);

			this.traverse(path);
		}
	});

	if (testAsts.length === 0) {
		throw new Error(`No tests found in ${filePath}.`);
	}

	return testAsts;
};
