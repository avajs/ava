'use strict';
const indentString = require('indent-string');
const chalk = require('chalk');
const test = require('tap').test;
const format = require('../lib/format-assert-error');

chalk.enabled = true;

test('diff objects', t => {
	const actual = format.formatValue({a: 1}).split('\n');
	const expected = format.formatValue({a: 2}).split('\n');

	t.same(format.formatDiff({a: 1}, {a: 2}), {
		label: 'Difference:',
		formatted: [
			'  ' + actual[0],
			`${chalk.red('-')} ${actual[1]}`,
			`${chalk.green('+')} ${expected[1]}`,
			'  ' + actual[2]
		].join('\n')
	});
	t.end();
});

test('diff arrays', t => {
	const actual = format.formatValue([1]).split('\n');
	const expected = format.formatValue([2]).split('\n');

	t.same(format.formatDiff([1], [2]), {
		label: 'Difference:',
		formatted: [
			'  ' + actual[0],
			`${chalk.red('-')} ${actual[1]}`,
			`${chalk.green('+')} ${expected[1]}`,
			'  ' + actual[2]
		].join('\n')
	});
	t.end();
});

test('diff strings', t => {
	t.same(format.formatDiff('abc', 'abd'), {
		label: 'Difference:',
		formatted: `${chalk.red('"ab')}${chalk.bgRed.black('c')}${chalk.bgGreen.black('d')}${chalk.red('"')}`
	});
	t.end();
});

test('does not diff different types', t => {
	t.is(format.formatDiff([], {}), null);
	t.end();
});

test('formats with a given label', t => {
	t.same(format.formatWithLabel('foo', {foo: 'bar'}), {
		label: 'foo',
		formatted: format.formatValue({foo: 'bar'})
	});
	t.end();
});

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

	t.is(format.formatSerializedError(err), [
		'Actual:\n',
		`${indentString(err.values[0].formatted, 2)}\n`,
		'Expected:\n',
		`${indentString(err.values[1].formatted, 2)}\n`
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

	t.is(format.formatSerializedError(err), [
		'Actual:\n',
		`${indentString(err.values[0].formatted, 2)}\n`
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

	t.is(format.formatSerializedError(err), [
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

	t.is(format.formatSerializedError(err), [
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

	t.is(format.formatSerializedError(err), [
		'Actual:',
		`${indentString(err.values[0].formatted, 2)}`,
		`actual.a[0]\n${chalk.grey('=>')} ${format.formatValue(1)}`
	].join('\n\n') + '\n');
	t.end();
});
