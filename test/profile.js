'use strict';
var path = require('path');
var test = require('tap').test;
var execa = require('execa');
var arrify = require('arrify');
global.Promise = require('bluebird');

var cwd = path.join(__dirname, '..');
var profileScript = path.join(cwd, 'profile.js');
var fixtureDir = path.join(cwd, 'test', 'fixture');

function fixture(file) {
	// add .js extension
	file = /\.[a-z]{1,6}$/.test(file) ? file : file + '.js';
	return path.relative(cwd, path.join(fixtureDir, file));
}

function run(files) {
	return execa(process.execPath, [profileScript].concat(arrify(files).map(fixture)), {cwd: cwd});
}

test('runs the profiler and throws an error when invoked without files to run', function (t) {
	t.plan(1);
	run()
		.catch(function (err) {
			t.ok(/Specify a test file/.test(err.stderr));
			t.end();
		});
});

test('exits normally when tests pass', function (t) {
	t.plan(1);
	run('es2015')
		.catch(function (err) {
			t.fail(err);
		})
		.then(function () {
			t.pass();
			t.end();
		});
});

test('exits with a non-zero exit code when one test fails', function (t) {
	t.plan(1);
	run('one-pass-one-fail')
		.then(function () {
			t.fail();
		})
		.catch(function (err) {
			t.true(Boolean(err.code));
			t.end();
		});
});

test('exits with a non-zero exit code when there is an uncaught exception', function (t) {
	t.plan(1);
	run('uncaught-exception')
		.then(function () {
			t.fail();
		})
		.catch(function (err) {
			t.true(Boolean(err.code));
			t.end();
		});
});
