'use strict';

const path = require('path');
const escapeStringRegExp = require('escape-string-regexp');
const {test} = require('tap');
const AST = require('recast');
const parseTestSourceInFile = require('../lib/test-ast');

const printAsOneLine = ast => AST.print(ast).code.replace(/\n/g, ' ').replace(/\s+/g, ' ');

const testFilePath = path.join(__dirname, 'fixture', 'test-ast.js');
// Escaping needed for Windows
const escapedTestFilePath = escapeStringRegExp(testFilePath);

test('test matches start line number', t => {
	const unicornTestSource = 'test(\'unicorn\', t => { t.pass(); })';
	const rainbowTestSource = 'test(\'rainbow\', t => { t.pass(); })';
	t.is(
		printAsOneLine(parseTestSourceInFile({startLineNumber: 3}, testFilePath)),
		unicornTestSource
	);
	t.is(
		printAsOneLine(parseTestSourceInFile({startLineNumber: 7}, testFilePath)),
		rainbowTestSource
	);
	t.end();
});

test('two tests starting on same line number', t => {
	const catTestSource = 'test(\'cat\', t => t.pass())';
	const dogTestSource = 'test(\'dog\', t => { t.pass(); })';
	t.is(
		AST.print(parseTestSourceInFile({startLineNumber: 12, startColumnNumber: 1}, testFilePath)).code,
		catTestSource
	);
	t.is(
		printAsOneLine(parseTestSourceInFile({startLineNumber: 12, startColumnNumber: 29}, testFilePath)),
		dogTestSource
	);
	t.end();
});

test('no test matches start line number -> throws', t => {
	t.throws(() => parseTestSourceInFile({startLineNumber: 6}, testFilePath),
		new RegExp(`No test at 6:1 in ${escapedTestFilePath}.`)
	);
	t.end();
});

test('non-existing file -> throws', t => {
	const nonExistingFilePath = path.join(__dirname, 'fixture', 'nonexistent');
	t.throws(
		() => parseTestSourceInFile({startLineNumber: 3}, nonExistingFilePath),
		new RegExp(`File ${escapeStringRegExp(nonExistingFilePath)} not found.`)
	);
	t.end();
});

test('directory -> throws', t => {
	const directoryFilePath = path.join(__dirname, 'fixture');
	t.throws(
		() => parseTestSourceInFile({startLineNumber: 3}, directoryFilePath),
		new RegExp(`${escapeStringRegExp(directoryFilePath)} is not a file.`)
	);
	t.end();
});
