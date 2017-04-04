'use strict';
const chalk = require('chalk');
const concordance = require('concordance');
const test = require('tap').test;
const formatSerializedError = require('../../lib/reporters/format-serialized-error');

test('indicates message should not be printed if it is empty', t => {
	const err = {
		message: '',
		statements: [],
		values: [{label: '', formatted: ''}]
	};
	t.false(formatSerializedError(err).printMessage);
	t.end();
});

test('indicates message should not be printed if the first value label starts with the message', t => {
	const err = {
		message: 'foo',
		statements: [],
		values: [{label: 'foobar', formatted: ''}]
	};
	t.false(formatSerializedError(err).printMessage);
	t.end();
});

test('indicates message should be printed if not empty and the first value label does not start with the message', t => {
	const err = {
		message: 'foo',
		statements: [],
		values: [{label: 'barfoo', formatted: ''}]
	};
	t.true(formatSerializedError(err).printMessage);
	t.end();
});

test('print multiple values', t => {
	const err = {
		statements: [],
		values: [
			{
				label: 'Actual:',
				formatted: concordance.format([1, 2, 3])
			},
			{
				label: 'Expected:',
				formatted: concordance.format({a: 1, b: 2, c: 3})
			}
		]
	};

	t.is(formatSerializedError(err).formatted, [
		'Actual:\n',
		`${err.values[0].formatted}\n`,
		'Expected:\n',
		err.values[1].formatted
	].join('\n'));
	t.end();
});

test('print single value', t => {
	const err = {
		statements: [],
		values: [
			{
				label: 'Actual:',
				formatted: concordance.format([1, 2, 3])
			}
		]
	};

	t.is(formatSerializedError(err).formatted, [
		'Actual:\n',
		err.values[0].formatted
	].join('\n'));
	t.end();
});

test('print multiple statements', t => {
	const err = {
		statements: [
			['actual.a[0]', concordance.format(1)],
			['actual.a', concordance.format([1])],
			['actual', concordance.format({a: [1]})]
		],
		values: []
	};

	t.is(formatSerializedError(err).formatted, [
		`actual.a[0]\n${chalk.grey('=>')} ${concordance.format(1)}`,
		`actual.a\n${chalk.grey('=>')} ${concordance.format([1])}`,
		`actual\n${chalk.grey('=>')} ${concordance.format({a: [1]})}`
	].join('\n\n'));
	t.end();
});

test('print single statement', t => {
	const err = {
		statements: [
			['actual.a[0]', concordance.format(1)]
		],
		values: []
	};

	t.is(formatSerializedError(err).formatted, [
		`actual.a[0]\n${chalk.grey('=>')} ${concordance.format(1)}`
	].join('\n\n'));
	t.end();
});

test('print statements after values', t => {
	const err = {
		statements: [
			['actual.a[0]', concordance.format(1)]
		],
		values: [
			{
				label: 'Actual:',
				formatted: concordance.format([1, 2, 3])
			}
		]
	};

	t.is(formatSerializedError(err).formatted, [
		'Actual:',
		`${err.values[0].formatted}`,
		`actual.a[0]\n${chalk.grey('=>')} ${concordance.format(1)}`
	].join('\n\n'));
	t.end();
});
