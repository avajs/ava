'use strict';

const path = require('path');
const escapeStringRegExp = require('escape-string-regexp');
const {test} = require('tap');
const AST = require('recast');
const parseTestSources = require('../lib/test-ast');

const printAsOneLine = ast => AST.print(ast).code.replace(/\n/g, ' ').replace(/\s+/g, ' ');
const testFilePath = path.join(__dirname, 'fixture', 'test-ast.js');

test('two tests', t => {
	const unicornTestSource = 'test(\'unicorn\', t => { t.pass(); })';
	const rainbowTestSource = 'test.serial(\'rainbow\', t => { t.pass(); })';
	const sources = parseTestSources(testFilePath).map(printAsOneLine);
	t.ok(sources.includes(unicornTestSource));
	t.ok(sources.includes(rainbowTestSource));
	t.end();
});

test('no tests in file -> throws', t => {
	const emptyFilePath = path.join(__dirname, 'fixture', 'test-ast-empty.js');
	t.throws(() => parseTestSources(emptyFilePath),
		new RegExp(`No tests found in ${escapeStringRegExp(emptyFilePath)}.`)
	);
	t.end();
});

test('non-existing file -> throws', t => {
	const nonExistingFilePath = path.join(__dirname, 'fixture', 'nonexistent');
	t.throws(
		() => parseTestSources(nonExistingFilePath),
		new RegExp(`File ${escapeStringRegExp(nonExistingFilePath)} not found.`)
	);
	t.end();
});

test('directory -> throws', t => {
	const directoryFilePath = path.join(__dirname, 'fixture');
	t.throws(
		() => parseTestSources(directoryFilePath),
		new RegExp(`${escapeStringRegExp(directoryFilePath)} is not a file.`)
	);
	t.end();
});
