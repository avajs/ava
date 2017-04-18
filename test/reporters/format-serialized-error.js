'use strict';
const chalk = require('chalk');
const test = require('tap').test;
const format = require('../../lib/format-assert-error');
const formatSerializedError = require('../../lib/reporters/format-serialized-error');

test('print multiple values', t => {
	const err = {
		statements: [],
		values: [
			{
				label: 'Actual:',
				formatted: format.formatValue([1, 2, 3])
			},
			{
				label: 'Expected:',
				formatted: format.formatValue({a: 1, b: 2, c: 3})
			}
		]
	};

	t.is(formatSerializedError(err), [
		'Actual:\n',
		`${err.values[0].formatted}\n`,
		'Expected:\n',
		`${err.values[1].formatted}\n`
	].join('\n'));
	t.end();
});

test('print single value', t => {
	const err = {
		statements: [],
		values: [
			{
				label: 'Actual:',
				formatted: format.formatValue([1, 2, 3])
			}
		]
	};

	t.is(formatSerializedError(err), [
		'Actual:\n',
		`${err.values[0].formatted}\n`
	].join('\n'));
	t.end();
});

test('print multiple statements', t => {
	const err = {
		statements: [
			['actual.a[0]', format.formatValue(1)],
			['actual.a', format.formatValue([1])],
			['actual', format.formatValue({a: [1]})]
		],
		values: []
	};

	t.is(formatSerializedError(err), [
		`actual.a[0]\n${chalk.grey('=>')} ${format.formatValue(1)}`,
		`actual.a\n${chalk.grey('=>')} ${format.formatValue([1])}`,
		`actual\n${chalk.grey('=>')} ${format.formatValue({a: [1]})}`
	].join('\n\n') + '\n');
	t.end();
});

test('print single statement', t => {
	const err = {
		statements: [
			['actual.a[0]', format.formatValue(1)]
		],
		values: []
	};

	t.is(formatSerializedError(err), [
		`actual.a[0]\n${chalk.grey('=>')} ${format.formatValue(1)}`
	].join('\n\n') + '\n');
	t.end();
});

test('print statements after values', t => {
	const err = {
		statements: [
			['actual.a[0]', format.formatValue(1)]
		],
		values: [
			{
				label: 'Actual:',
				formatted: format.formatValue([1, 2, 3])
			}
		]
	};

	t.is(formatSerializedError(err), [
		'Actual:',
		`${err.values[0].formatted}`,
		`actual.a[0]\n${chalk.grey('=>')} ${format.formatValue(1)}`
	].join('\n\n') + '\n');
	t.end();
});
