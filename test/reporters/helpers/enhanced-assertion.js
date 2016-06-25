'use strict';
var test = require('tap').test;
var chalk = require('chalk');
var EnhancedAssertion = require('../../../lib/reporters/helpers/enhanced-assertion');
var compareLineOutput = require('../../helper/compare-line-output');

test('Show `expected` and `actual` without a message', function (t) {
	var assertionError = {
		actual: 4,
		expected: 3,
		name: 'AssertionError',
		message: '3 == 4'
	};
	var enhancedAssertion = new EnhancedAssertion();
	var output = enhancedAssertion.error(assertionError);

	compareLineOutput(t, output, [
		'',
		'    ' + chalk.red('AssertionError: 3 == 4'),
		chalk.green('    + expected') + chalk.red(' - actual'),
		'',
		chalk.red('    -4'),
		chalk.green('    +3')
	]);

	t.end();
});

test('Show `expected` and `actual` with a message', function (t) {
	var assertionError = {
		actual: 4,
		expected: 3,
		name: 'AssertionError',
		message: 'foo'
	};

	var enhancedAssertion = new EnhancedAssertion();
	var output = enhancedAssertion.error(assertionError);

	compareLineOutput(t, output, [
		'',
		'    ' + chalk.red('AssertionError: foo'),
		chalk.green('    + expected') + chalk.red(' - actual'),
		'',
		chalk.red('    -4'),
		chalk.green('    +3')
	]);

	t.end();
});

test('Show a simple AssertionError message', function (t) {
	var assertionError = {
		actual: null,
		expected: null,
		name: 'AssertionError',
		message: 'foo'
	};

	var enhancedAssertion = new EnhancedAssertion();
	var output = enhancedAssertion.error(assertionError);

	compareLineOutput(t, output, [
		'',
		'    ' + chalk.red('AssertionError: foo')
	]);

	t.end();
});
