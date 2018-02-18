'use strict';
require('../lib/chalk').set();

const path = require('path');
const test = require('tap').test;
const chalk = require('chalk');
const figures = require('figures');
const RunStatus = require('../lib/run-status');

const sep = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

test('prefixTitle returns empty if prefixTitles == false', t => {
	const runStatus = new RunStatus({prefixTitles: false});
	t.is(runStatus.prefixTitle('test/run-status.js'), '');
	t.end();
});

test('prefixTitle removes base if found at start of path', t => {
	const runStatus = new RunStatus({base: `test${path.sep}`});
	t.is(runStatus.prefixTitle(path.normalize('test/run-status.js')), `run-status${sep}`);
	t.end();
});

test('prefixTitle does not remove base if found but not at start of path', t => {
	const runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('test/run-status.js')), `test${sep}run-status${sep}`);
	t.end();
});

test('prefixTitle removes .js extension', t => {
	const runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle('run-status.js'), `run-status${sep}`);
	t.end();
});

test('prefixTitle does not remove .js from middle of path', t => {
	const runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle('run-.js-status.js'), `run-.js-status${sep}`);
	t.end();
});

test('prefixTitle removes __tests__ from path', t => {
	const runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/__tests__/run-status.js')), `backend${sep}run-status${sep}`);
	t.end();
});

test('prefixTitle removes .spec from path', t => {
	const runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/run-status.spec.js')), `backend${sep}run-status${sep}`);
	t.end();
});

test('prefixTitle removes .test from path', t => {
	const runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/run-status.test.js')), `backend${sep}run-status${sep}`);
	t.end();
});

test('prefixTitle removes test- from path', t => {
	const runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/test-run-status.js')), `backend${sep}run-status${sep}`);
	t.end();
});

test('successfully initializes without any options provided', t => {
	const runStatus = new RunStatus();
	t.is(runStatus.base, '');
	t.end();
});

test('calculate remaining test count', t => {
	const runStatus = new RunStatus();
	runStatus.testCount = 10;

	const results = [{
		stats: {
			passCount: 1,
			failCount: 1,
			skipCount: 1,
			todoCount: 1,
			knownFailureCount: 1
		}
	}];

	runStatus.processResults(results);

	t.is(runStatus.remainingCount, 5);
	t.end();
});
