'use strict';
var test = require('tape');
var path = require('path');
var fork = require('../lib/fork.js');

function fixture(name) {
	return path.join(__dirname, 'fixture', name);
}

test('emits test event', function (t) {
	fork(fixture('generators.js'))
		.on('test', function (tt) {
			t.equal(tt.title, 'generator function');
			t.end();
		});
});

test('resolves promise with tests info', function (t) {
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
	var buffer = '';

	fork(fixture('broken.js'))
		.on('data', function (data) {
			buffer += data;
		})
		.catch(function () {
			t.ok(/no such file or directory/.test(buffer));
			t.end();
		});
});

test('exit after tests are finished', function (t) {
	t.plan(2);

	var start = Date.now();
	var cleanupCompleted = false;

	fork(fixture('long-running.js'))
		.on('exit', function () {
			t.ok(Date.now() - start < 10000, 'should NOT wait for setTimeout(fn, 15000)');
			t.ok(cleanupCompleted, 'should wait for onExit(fn) to complete');
		})
		.on('cleanup-completed', function (event) {
			cleanupCompleted = event.completed;
		});
});
