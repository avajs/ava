'use strict';
const tempWrite = require('temp-write');
const chalk = require('chalk');
const test = require('tap').test;
const codeExcerpt = require('../lib/code-excerpt');

chalk.enabled = true;

test('read code excerpt', t => {
	const path = tempWrite.sync([
		'function a() {',
		'\talert();',
		'}'
	].join('\n'));

	const excerpt = codeExcerpt(path, 2);
	const expected = [
		` ${chalk.grey('1:')} function a() {`,
		chalk.bgRed(` 2:   alert();    `),
		` ${chalk.grey('3:')} }             `
	].join('\n');

	t.is(excerpt, expected);
	t.end();
});

test('truncate lines', t => {
	const path = tempWrite.sync([
		'function a() {',
		'\talert();',
		'}'
	].join('\n'));

	const excerpt = codeExcerpt(path, 2, {maxWidth: 14});
	const expected = [
		` ${chalk.grey('1:')} function a(…`,
		chalk.bgRed(` 2:   alert();  `),
		` ${chalk.grey('3:')} }           `
	].join('\n');

	t.is(excerpt, expected);
	t.end();
});

test('format line numbers', t => {
	const path = tempWrite.sync([
		'', '', '', '', '', '', '', '',
		'function a() {',
		'\talert();',
		'}'
	].join('\n'));

	const excerpt = codeExcerpt(path, 10);
	const expected = [
		` ${chalk.grey(' 9:')} function a() {`,
		chalk.bgRed(` 10:   alert();    `),
		` ${chalk.grey('11:')} }             `
	].join('\n');

	t.is(excerpt, expected);
	t.end();
});
