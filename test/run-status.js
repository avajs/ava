'use strict';
var path = require('path');
var test = require('tap').test;
var chalk = require('chalk');
var figures = require('figures');
var RunStatus = require('../lib/run-status');

var sep = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

test('requires new', function (t) {
	var runStatus = RunStatus;
	t.throws(function () {
		runStatus({});
	}, 'Class constructor RunStatus cannot be invoked without \'new\'');
	t.end();
});

test('prefixTitle returns empty if prefixTitles == false', function (t) {
	var runStatus = new RunStatus({prefixTitles: false});
	t.is(runStatus.prefixTitle('test/run-status.js'), '');
	t.end();
});

test('prefixTitle removes base if found at start of path', function (t) {
	var runStatus = new RunStatus({base: 'test' + path.sep});
	t.is(runStatus.prefixTitle(path.normalize('test/run-status.js')), 'run-status' + sep);
	t.end();
});

test('prefixTitle does not remove base if found but not at start of path', function (t) {
	var runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('test/run-status.js')), 'test' + sep + 'run-status' + sep);
	t.end();
});

test('prefixTitle removes .js extension', function (t) {
	var runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle('run-status.js'), 'run-status' + sep);
	t.end();
});

test('prefixTitle does not remove .js from middle of path', function (t) {
	var runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle('run-.js-status.js'), 'run-.js-status' + sep);
	t.end();
});

test('prefixTitle removes __tests__ from path', function (t) {
	var runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/__tests__/run-status.js')), 'backend' + sep + 'run-status' + sep);
	t.end();
});

test('prefixTitle removes .spec from path', function (t) {
	var runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/run-status.spec.js')), 'backend' + sep + 'run-status' + sep);
	t.end();
});

test('prefixTitle removes .test from path', function (t) {
	var runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/run-status.test.js')), 'backend' + sep + 'run-status' + sep);
	t.end();
});

test('prefixTitle removes test- from path', function (t) {
	var runStatus = new RunStatus({base: path.sep});
	t.is(runStatus.prefixTitle(path.normalize('backend/test-run-status.js')), 'backend' + sep + 'run-status' + sep);
	t.end();
});

test('successfully initializes without any options provided', function (t) {
	var runStatus = new RunStatus();
	t.is(runStatus.base, '');
	t.end();
});
