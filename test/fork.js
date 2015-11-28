'use strict';
var path = require('path');
var test = require('tap').test;
var fork = require('../lib/fork.js');

function fixture(name) {
	return path.join(__dirname, 'fixture', name);
}

test('emits test event', function (t) {
	t.plan(1);

	fork(fixture('generators.js'))
		.run()
		.on('test', function (tt) {
			t.is(tt.title, 'generator function');
			t.end();
		});
});

test('resolves promise with tests info', function (t) {
	t.plan(3);

	var file = fixture('generators.js');

	fork(file)
		.run()
		.then(function (info) {
			t.is(info.stats.passCount, 1);
			t.is(info.tests.length, 1);
			t.is(info.file, file);
			t.end();
		});
});

test('rejects on error and streams output', function (t) {
	t.plan(2);

	fork(fixture('broken.js'))
		.run()
		.on('uncaughtException', function (data) {
			t.true(/no such file or directory/.test(data.exception.message));
		})
		.catch(function () {
			t.pass();
			t.end();
		});
});

test('exit after tests are finished', function (t) {
	t.plan(2);

	var start = Date.now();
	var cleanupCompleted = false;

	fork(fixture('long-running.js'))
		.run()
		.on('exit', function () {
			t.true(Date.now() - start < 10000, 'test waited for a pending setTimeout');
			t.true(cleanupCompleted, 'cleanup did not complete');
		})
		.on('cleanup-completed', function (event) {
			cleanupCompleted = event.completed;
		});
});

test('fake timers do not break duration', function (t) {
	fork(fixture('fake-timers.js'))
		.run()
		.then(function (info) {
			var duration = info.tests[0].duration;
			t.true(duration < 1000, duration + ' < 1000');
			t.end();
		});
});
