'use strict';
var path = require('path');
var chalk = require('chalk');
var hasAnsi = require('has-ansi');
var sinon = require('sinon');
var test = require('tap').test;
var NotifyReporter = require('../../lib/reporters/notify');

test('passing test', function (t) {
	var reporter = new NotifyReporter();

	var actualOutput = reporter.test({
		title: 'passing'
	});

	var expectedOutput = null;

	t.same(actualOutput, expectedOutput);
	t.end();
});

test('failing test', function (t) {
	var reporter = new NotifyReporter();

	var actualOutput = reporter.test({
		title: 'failing'
	});

	var expectedOutput = null;
	t.same(actualOutput, expectedOutput);
	t.end();
});

test('unhandled error', function (t) {
	var reporter = new NotifyReporter();

	var actualOutput = reporter.unhandledError({
		message: 'unhandled',
		name: 'TypeError',
		stack: ['', 'Test.fn (test.js:1:2)'].join('\n')
	});

	var expectedOutput = {
		title: 'AVA',
		icon: path.join(__dirname, '../../media/logo-square.png'),
		type: 'error',
		message: 'There was some problem.'
	};

	t.same(actualOutput, expectedOutput);
	t.end();
});

test('ava error', function (t) {
	var reporter = new NotifyReporter();

	var actualOutput = reporter.unhandledError({
		type: 'error',
		name: 'AvaError',
		message: 'A futuristic test runner'
	});

	var expectedOutput = {
		title: 'AVA',
		icon: path.join(__dirname, '../../media/logo-square.png'),
		type: 'error',
		message: 'There was some problem: A futuristic test runner'
	};

	t.same(actualOutput, expectedOutput);
	t.end();
});

test('results', function (t) {
	var reporter = new NotifyReporter();
	var runStatus = {
		passCount: 1,
		failCount: 1,
		skipCount: 1,
		rejectionCount: 3,
		exceptionCount: 4,
		errors: [{
			title: 'failure',
			message: 'unhandled'
		}]
	};

	var actualOutput = reporter.finish(runStatus);

	var expectedOutput = {
		title: 'AVA',
		icon: path.join(__dirname, '../../media/logo-square.png'),
		type: 'warn',
		message: '"failure" and 0 other tests failed.'
	};

	t.same(actualOutput, expectedOutput);
	t.end();
});

test('write should call notifier', function (t) {
	var notifier = {
		notify: function () { }
	};

	var mock = sinon.mock(notifier, 'notify').expects('notify').once();

	var reporter = new NotifyReporter(notifier);

	reporter.write({});

	mock.verify();
	t.end();
});

test('reporter strips ANSI characters', function (t) {
	var reporter = new NotifyReporter();

	var output = reporter.finish({
		failCount: 1,
		errors: [{
			title: 'test ' + chalk.gray.dim('›') + ' my test',
			type: 'test',
			file: 'test.js'
		}]
	});

	t.notOk(hasAnsi(output.title));
	t.end();
});

test('reporter handles warn type formatting', function (t) {
	var expectedOutput = {
		type: 'warn',
		message: '⚠️ unhandled'
	};

	var notifier = {
		notify: function (actualOutput) {
			t.same(actualOutput, expectedOutput);
		}
	};

	var reporter = new NotifyReporter(notifier);

	reporter.write({
		type: 'warn',
		message: 'unhandled'
	});

	t.end();
});

test('reporter handles error type formatting', function (t) {
	var expectedOutput = {
		type: 'error',
		message: '❌ unhandled'
	};

	var notifier = {
		notify: function (actualOutput) {
			t.same(actualOutput, expectedOutput);
		}
	};

	var reporter = new NotifyReporter(notifier);

	reporter.write({
		type: 'error',
		message: 'unhandled'
	});

	t.end();
});
