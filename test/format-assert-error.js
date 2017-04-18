'use strict';
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
