'use strict';
var path = require('path');
var test = require('tap').test;
var execa = require('execa');
var arrify = require('arrify');

var cwd = path.join(__dirname, '..');
var profileScript = path.join(cwd, 'profile.js');
var fixtureDir = path.join(cwd, 'test', 'fixture');

function fixture(file) {
	// add .js extension
	file = /\.[a-z]{1,6}$/.test(file) ? file : file + '.js';
	return path.join(fixtureDir, file);
}

function run(files) {
	return execa('node', [profileScript].concat(arrify(files).map(fixture)), {cwd: cwd});
}

test('exits with 0 exit code when tests pass', function (t) {
	t.plan(1);
	run('es2015')
		.catch(function (e) {
			t.fail(e);
		})
		.then(function () {
			t.pass();
			t.end();
		});
});

test('exits with 1 exit code when one test fails', function (t) {
	t.plan(1);
	run('one-pass-one-fail')
		.then(function () {
			t.fail();
		})
		.catch(function (err) {
			t.is(err.code, 1);
			t.end();
		})
});

test('exits with non-zero exit code when there is an uncaught exception', function (t) {
	t.plan(1);
	run('uncaught-exception')
		.then(function () {
			t.fail();
		})
		.catch(function (err) {
			t.true(err.code > 0);
			t.end();
		})
});
