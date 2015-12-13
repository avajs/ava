'use strict';
var test = require('tap').test;
var logger = require('../lib/logger');
var figures = require('figures');
var hookStd = require('hook-std');

test('beautify stack - removes uninteresting lines', function (t) {
	try {
		fooFunc();
	} catch (err) {
		var stack = logger._beautifyStack(err.stack);
		t.match(stack, /fooFunc/);
		t.match(stack, /barFunc/);
		t.match(err.stack, /Module._compile/);
		t.notMatch(stack, /Module\._compile/);
		t.end();
	}
});

test('logger.write', function (t) {
	t.plan(1);

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), 'Test');
		t.end();
	});

	logger.write('Test');
});

test('logger.writelpad', function (t) {
	t.plan(1);

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), '  Test');
		t.end();
	});

	logger.writelpad('Test');
});

test('logger.success', function (t) {
	t.plan(1);

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), '  ' + figures.tick + ' Test');
		t.end();
	});

	logger.success('Test');
});

test('logger.error', function (t) {
	t.plan(1);

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), '  ' + figures.cross + ' Test');
		t.end();
	});

	logger.error('Test');
});

test('logger.test with passing test and duration less than threshold', function (t) {
	t.plan(1);

	var passingTest = {
		title: 'Passed',
		duration: 90
	};

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), '  ' + figures.tick + ' Passed');
		t.end();
	});

	logger.test(passingTest);
});

test('logger.test with passing test and duration greater than threshold', function (t) {
	t.plan(1);

	var passingTest = {
		title: 'Passed',
		duration: 150
	};

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), '  ' + figures.tick + ' Passed (150ms)');
		t.end();
	});

	logger.test(passingTest);
});

test('logger.test with failing test', function (t) {
	t.plan(1);

	var passingTest = {
		title: 'Failed',
		err: {
			message: 'Assertion failed'
		}
	};

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), '  ' + figures.cross + ' Failed Assertion failed');
		t.end();
	});

	logger.test(passingTest);
});

test('logger.test with skipped test', function (t) {
	t.plan(1);

	var skippedTest = {
		title: 'Skipped',
		skipped: true
	};

	var unhook = hookStd.stderr({silent: true}, function (output) {
		unhook();

		t.is(output.toString(), '  ' + figures.tick + ' Skipped');
		t.end();
	});

	logger.test(skippedTest);
});

test('logger.errors', function (t) {
	t.plan(1);

	var lines = [];
	var failedTest = {
		title: 'Failed',
		error: {
			stack: 'Unexpected token'
		}
	};

	hookStd.stderr({silent: true}, function (output) {
		onLine(lines, output);
	});

	logger.errors([failedTest]);

	t.is(lines.join(''), '1. Failed\nUnexpected token\n');
});

test('logger.report', function (t) {
	t.plan(1);

	var lines = [];

	hookStd.stderr({silent: true}, function (output) {
		onLine(lines, output);
	});

	logger.report(1, 2, 1, 2);

	t.is(lines.join(''), '2 tests failed\n1 unhandled rejection\n2 uncaught exceptions\n');
});

test('logger.unhandledError with exception with stack', function (t) {
	t.plan(2);

	var lines = [];

	hookStd.stderr({silent: true}, function (output) {
		onLine(lines, output);
	});

	logger.unhandledError('exception', 'test.js', new Error('Unexpected token'));

	t.is(lines[0], 'Uncaught Exception: test.js\n');
	t.match(lines[1], /Error: Unexpected token\n\s+at Test.test/);
});

test('logger.unhandledError with exception without stack', function (t) {
	t.plan(2);

	var lines = [];
	var error = {
		message: 'Unexpected token'
	};

	hookStd.stderr({silent: true}, function (output) {
		onLine(lines, output);
	});

	logger.unhandledError('exception', 'test.js', error);

	t.is(lines[0], 'Uncaught Exception: test.js\n');
	t.is(lines[1], '{"message":"Unexpected token"}\n');
});

test('logger.unhandledError rejection with stack', function (t) {
	t.plan(2);

	var lines = [];

	hookStd.stderr({silent: true}, function (output) {
		onLine(lines, output);
	});

	logger.unhandledError('rejection', 'test.js', new Error('I have been rejected'));

	t.is(lines[0], 'Unhandled Rejection: test.js\n');
	t.match(lines[1], /Error: I have been rejected\s+at Test.test/);
});

test('logger.unhandledError rejection without stack', function (t) {
	t.plan(2);

	var lines = [];
	var error = {
		message: 'I have been rejected'
	};

	hookStd.stderr({silent: true}, function (output) {
		onLine(lines, output);
	});

	logger.unhandledError('rejection', 'test.js', error);

	t.is(lines[0], 'Unhandled Rejection: test.js\n');
	t.is(lines[1], '{"message":"I have been rejected"}\n');
});

function fooFunc() {
	barFunc();
}

function barFunc() {
	throw new Error();
}

function onLine(lines, line) {
	var trimmed = line.trim();
	if (trimmed.length) {
		lines.push(line.trim() + '\n');
	}
}
