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
		.on('test', function (tt) {
			t.equal(tt.title, 'generator function');
			t.end();
		});
});

test('resolves promise with tests info', function (t) {
	t.plan(3);

	var file = fixture('generators.js');

	fork(file)
		.then(function (info) {
			t.equal(info.stats.passCount, 1);
			t.equal(info.tests.length, 1);
			t.equal(info.file, file);
			t.end();
		});
});

test('rejects on error and streams output', function (t) {
	t.plan(2);

	fork(fixture('broken.js'))
		.on('uncaughtException', function (data) {
			t.ok(/no such file or directory/.test(data.exception.message));
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
		.on('exit', function () {
			t.ok(Date.now() - start < 10000, 'test waited for a pending setTimeout');
			t.ok(cleanupCompleted, 'cleanup did not complete');
		})
		.on('cleanup-completed', function (event) {
			cleanupCompleted = event.completed;
		});
});
