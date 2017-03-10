'use strict';
const indentString = require('indent-string');
const prettyFormat = require('@ava/pretty-format');
const chalk = require('chalk');
const test = require('tap').test;
const format = require('../lib/format-assert-error');

chalk.enabled = true;

test('render statements', t => {
	const err = {
		statements: JSON.stringify([
			['actual.a[0]', prettyFormat(1)],
			['actual.a', prettyFormat([1])],
			['actual', prettyFormat({a: [1]})]
		])
	};

	t.is(format(err), [
		`actual.a[0]\n${chalk.grey('=>')} ${prettyFormat(1)}`,
		`actual.a\n${chalk.grey('=>')} ${prettyFormat([1])}`,
		`actual\n${chalk.grey('=>')} ${prettyFormat({a: [1]})}`
	].join('\n\n') + '\n');
	t.end();
});

test('diff objects', t => {
	const err = {
		actual: {
			type: 'object',
			formatted: prettyFormat({a: 1})
		},
		expected: {
			type: 'object',
			formatted: prettyFormat({a: 2})
		}
	};

	t.is(format(err), [
		'Difference:\n',
		'  Object {',
		`${chalk.red('-')}   a: 1,`,
		`${chalk.green('+')}   a: 2,`,
		'  }',
		''
	].join('\n'));
	t.end();
});

test('diff arrays', t => {
	const err = {
		actual: {
			type: 'array',
			formatted: prettyFormat([1])
		},
		expected: {
			type: 'array',
			formatted: prettyFormat([2])
		}
	};

	t.is(format(err), [
		'Difference:\n',
		'  Array [',
		`${chalk.red('-')}   1,`,
		`${chalk.green('+')}   2,`,
		'  ]',
		''
	].join('\n'));
	t.end();
});

test('diff strings', t => {
	const err = {
		actual: {
			type: 'string',
			formatted: 'abc'
		},
		expected: {
			type: 'string',
			formatted: 'abd'
		}
	};

	t.is(format(err), [
		'Difference:\n',
		`${chalk.red('ab')}${chalk.bgRed.black('c')}${chalk.bgGreen.black('d')}\n`
	].join('\n'));
	t.end();
});

test('diff different types', t => {
	const err = {
		actual: {
			type: 'array',
			formatted: prettyFormat([1, 2, 3])
		},
		expected: {
			type: 'object',
			formatted: prettyFormat({a: 1, b: 2, c: 3})
		}
	};

	t.is(format(err), [
		'Actual:\n',
		`${indentString(err.actual.formatted, 2)}\n`,
		'Expected:\n',
		`${indentString(err.expected.formatted, 2)}\n`
	].join('\n'));
	t.end();
});
