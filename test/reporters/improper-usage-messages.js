'use strict';

const test = require('tap').test;
const chalk = require('chalk');
const improperUsageMessages = require('../../lib/reporters/improper-usage-messages');

test('results with throws', t => {
	const err = {
		assertion: 'throws',
		improperUsage: {
			name: 'name',
			snapPath: 'path',
			snapVersion: 1,
			expectedVersion: 2
		}
	};

	const actualOutput = improperUsageMessages.forError(err);

	const expectedOoutput = [
		'Try wrapping the first argument to `t.throws()` in a function:',
		'',
		`  ${chalk.cyan('t.throws(() => { ')}${chalk.grey('/* your code here */')}${chalk.cyan(' })')}`,
		'',
		'Visit the following URL for more details:',
		'',
		`  ${chalk.blue.underline('https://github.com/avajs/ava#throwsfunctionpromise-error-message')}`
	].join('\n');

	t.is(actualOutput, expectedOoutput);
	t.end();
});

test('results with notThrows', t => {
	const err = {
		assertion: 'notThrows',
		improperUsage: {
			name: 'name',
			snapPath: 'path',
			snapVersion: 1,
			expectedVersion: 2
		}
	};

	const actualOutput = improperUsageMessages.forError(err);

	const expectedOoutput = [
		'Try wrapping the first argument to `t.notThrows()` in a function:',
		'',
		`  ${chalk.cyan('t.notThrows(() => { ')}${chalk.grey('/* your code here */')}${chalk.cyan(' })')}`,
		'',
		'Visit the following URL for more details:',
		'',
		`  ${chalk.blue.underline('https://github.com/avajs/ava#throwsfunctionpromise-error-message')}`
	].join('\n');

	t.is(actualOutput, expectedOoutput);
	t.end();
});

test('results when snapshot\'s name is ChecksumError', t => {
	const err = {
		assertion: 'snapshot',
		improperUsage: {
			name: 'ChecksumError',
			snapPath: 'path',
			snapVersion: 1,
			expectedVersion: 2
		}
	};

	const actualOutput = improperUsageMessages.forError(err);

	const expectedOoutput = [
		'The snapshot file is corrupted.',
		'',
		`File path: ${chalk.yellow('path')}`,
		'',
		`Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to recreate it.`
	].join('\n');

	t.is(actualOutput, expectedOoutput);
	t.end();
});

test('results when snapshot\'s name is LegacyError', t => {
	const err = {
		assertion: 'snapshot',
		improperUsage: {
			name: 'LegacyError',
			snapPath: 'path',
			snapVersion: 1,
			expectedVersion: 2
		}
	};

	const actualOutput = improperUsageMessages.forError(err);

	const expectedOoutput = [
		'The snapshot file was created with AVA 0.19. It\'s not supported by this AVA version.',
		'',
		`File path: ${chalk.yellow('path')}`,
		'',
		`Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to upgrade.`
	].join('\n');

	t.is(actualOutput, expectedOoutput);
	t.end();
});

test('results when snapshot\'s name is VersionMismatchError and snapVersion < expectedVersion', t => {
	const err = {
		assertion: 'snapshot',
		improperUsage: {
			name: 'VersionMismatchError',
			snapPath: 'path',
			snapVersion: 1,
			expectedVersion: 2
		}
	};

	const actualOutput = improperUsageMessages.forError(err);

	const expectedOoutput = [
		`The snapshot file is v${err.improperUsage.snapVersion}, but only v${err.improperUsage.expectedVersion} is supported.`,
		'',
		`File path: ${chalk.yellow('path')}`,
		'',
		`Please run AVA again with the ${chalk.cyan('--update-snapshots')} flag to upgrade.`
	].join('\n');

	t.is(actualOutput, expectedOoutput);
	t.end();
});

test('results when snapshot\'s name is VersionMismatchError and snapVersion > expectedVersion', t => {
	const err = {
		assertion: 'snapshot',
		improperUsage: {
			name: 'VersionMismatchError',
			snapPath: 'path',
			snapVersion: 2,
			expectedVersion: 1
		}
	};

	const actualOutput = improperUsageMessages.forError(err);

	const expectedOoutput = [
		`The snapshot file is v${err.improperUsage.snapVersion}, but only v${err.improperUsage.expectedVersion} is supported.`,
		'',
		`File path: ${chalk.yellow('path')}`,
		'',
		'You should upgrade AVA.'
	].join('\n');

	t.is(actualOutput, expectedOoutput);
	t.end();
});

test('results when nothing is applicable', t => {
	const err = {
		assertion: 'assertion',
		improperUsage: {
			name: 'VersionMismatchError',
			snapPath: 'path',
			snapVersion: 2,
			expectedVersion: 1
		}
	};

	const actualOutput = improperUsageMessages.forError(err);

	t.is(actualOutput, null);
	t.end();
});
