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
			t.ok(/Cannot find module/.test(buffer));
			t.end();
		});
});
