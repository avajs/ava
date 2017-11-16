'use strict';
const path = require('path');
const test = require('tap').test;
const execa = require('execa');
const arrify = require('arrify');

const cwd = path.join(__dirname, '..');
const profileScript = path.join(cwd, 'profile.js');
const fixtureDir = path.join(cwd, 'test/fixture');

function fixture(file) {
	// Add .js extension
	file = /\.[a-z]{1,6}$/.test(file) ? file : `${file}.js`;
	return path.relative(cwd, path.join(fixtureDir, file));
}

function run(files) {
	return execa(process.execPath, [profileScript].concat(arrify(files).map(x => fixture(x))), {cwd});
}

test('runs the profiler and throws an error when invoked without files to run', t => {
	t.plan(1);
	run()
		.catch(err => {
			t.ok(/Specify a test file/.test(err.stderr));
			t.end();
		});
});

test('exits normally when tests pass', t => {
	t.plan(1);
	run('es2015')
		.catch(err => {
			t.fail(err);
		})
		.then(() => {
			t.pass();
			t.end();
		});
});

test('exits with a non-zero exit code when one test fails', t => {
	t.plan(1);
	run('one-pass-one-fail')
		.then(() => {
			t.fail();
		})
		.catch(err => {
			t.true(Boolean(err.code));
			t.end();
		});
});

test('exits with a non-zero exit code when there is an uncaught exception', t => {
	t.plan(1);
	run('uncaught-exception')
		.then(() => {
			t.fail();
		})
		.catch(err => {
			t.true(Boolean(err.code));
			t.end();
		});
});
