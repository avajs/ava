'use strict';
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var test = require('tap').test;
var hasAnsi = require('has-ansi');
var chalk = require('chalk');
var tapReporter = require('../../lib/reporters/tap');

function createReporter() {
	var reporter = tapReporter();
	reporter.output = null;

	reporter.write = function (str) {
		this.output = str;
	};

	return reporter;
}

function createRunStatus(options) {
	var status = new EventEmitter();
	assign(status, options);

	return status;
}

test('start', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	t.is(reporter.output, 'TAP version 13');
	t.end();
});

test('passing test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'passing'
	});

	var expectedOutput = [
		'# passing',
		'ok 1 - passing'
	].join('\n');

	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'failing',
		error: {
			message: 'false == true',
			operator: '==',
			expected: true,
			actual: false,
			stack: ['', 'Test.fn (test.js:1:2)'].join('\n')
		}
	});

	var expectedOutput = [
		'# failing',
		'not ok 1 - failing',
		'  ---',
		'    operator: ==',
		'    expected: true',
		'    actual: false',
		'    at: Test.fn (test.js:1:2)',
		'  ...'
	].join('\n');

	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('unhandled error', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('error', {
		message: 'unhandled',
		name: 'TypeError',
		stack: ['', 'Test.fn (test.js:1:2)'].join('\n')
	});

	var expectedOutput = [
		'# unhandled',
		'not ok 1 - unhandled',
		'  ---',
		'    name: TypeError',
		'    at: Test.fn (test.js:1:2)',
		'  ...'
	].join('\n');

	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('ava error', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('error', {
		type: 'exception',
		name: 'AvaError',
		message: 'A futuristic test runner'
	});

	var expectedOutput = [
		'# A futuristic test runner',
		'not ok 1 - A futuristic test runner'
	].join('\n');

	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		failCount: 2,
		skipCount: 1,
		rejectionCount: 3,
		exceptionCount: 4
	});

	reporter.init(status);

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'1..' + (status.passCount + status.failCount + status.skipCount),
		'# tests ' + (status.passCount + status.failCount + status.skipCount),
		'# pass ' + status.passCount,
		'# skip ' + status.skipCount,
		'# fail ' + (status.failCount + status.rejectionCount + status.exceptionCount),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results does not show skipped tests if there are none', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		failCount: 2,
		skipCount: 0,
		rejectionCount: 3,
		exceptionCount: 4
	});

	reporter.init(status);

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'1..' + (status.passCount + status.failCount),
		'# tests ' + (status.passCount + status.failCount),
		'# pass ' + status.passCount,
		'# fail ' + (status.failCount + status.rejectionCount + status.exceptionCount),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('todo test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'should think about doing this',
		passed: false,
		skip: true,
		todo: true
	});

	var expectedOutput = [
		'# should think about doing this',
		'not ok 1 - should think about doing this # TODO'
	].join('\n');

	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skip test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'skipped',
		passed: true,
		skip: true
	});

	var expectedOutput = [
		'# skipped',
		'ok 1 - skipped # SKIP'
	].join('\n');

	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('reporter strips ANSI characters', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'test ' + chalk.gray.dim('›') + ' my test',
		type: 'test',
		file: 'test.js'
	});

	t.notOk(hasAnsi(reporter.output));
	t.end();
});
