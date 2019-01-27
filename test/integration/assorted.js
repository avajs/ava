'use strict';
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const makeDir = require('make-dir');
const stripAnsi = require('strip-ansi');
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('timeout', t => {
	execCli(['long-running.js', '-T', '1s'], (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Timed out/);
		t.end();
	});
});

// FIXME: This test fails in CI, but not locally. Re-enable at some point…
// test('interrupt', t => {
// 	const proc = execCli(['long-running.js'], (_, stdout) => {
// 		t.match(stdout, /SIGINT/);
// 		t.end();
// 	});
//
// 	setTimeout(() => {
// 		proc.kill('SIGINT');
// 	}, 2000);
// });

test('include anonymous functions in error reports', t => {
	execCli('error-in-anonymous-function.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /test\/fixture\/error-in-anonymous-function\.js:4:8/);
		t.end();
	});
});

test('--match works', t => {
	execCli(['-m=foo', '-m=bar', '-m=!baz', '-m=t* a* f*', '-m=!t* a* n* f*', 'matcher-skip.js'], err => {
		t.ifError(err);
		t.end();
	});
});

for (const tapFlag of ['--tap', '-t']) {
	test(`${tapFlag} should produce TAP output`, t => {
		execCli([tapFlag, 'test.js'], {dirname: 'fixture/watcher'}, err => {
			t.ok(!err);
			t.end();
		});
	});
}

test('handles NODE_PATH', t => {
	const nodePaths = `node-paths/modules${path.delimiter}node-paths/deep/nested`;

	execCli('node-paths.js', {env: {NODE_PATH: nodePaths}}, err => {
		t.ifError(err);
		t.end();
	});
});

test('works when no files are found', t => {
	execCli('!*', (err, stdout) => {
		t.is(err.code, 1);
		t.match(stdout, 'Couldn\'t find any files to test');
		t.end();
	});
});

test('should warn ava is required without the cli', t => {
	childProcess.execFile(process.execPath, [path.resolve(__dirname, '../../index.js')], error => {
		t.ok(error);
		t.match(error.message, /Test files must be run with the AVA CLI/);
		t.end();
	});
});

test('prefers local version of ava', t => {
	execCli('', {
		dirname: 'fixture/local-bin',
		env: {
			DEBUG: 'ava'
		}
	}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, 'Using local install of AVA');
		t.end();
	});
});

test('workers ensure test files load the same version of ava', t => {
	const target = path.join(__dirname, '..', 'fixture', 'ava-paths', 'target');

	// Copy the index.js so the testFile imports it. It should then load the correct AVA install.
	const targetInstall = path.join(target, 'node_modules/ava');
	makeDir.sync(targetInstall);
	fs.writeFileSync(
		path.join(targetInstall, 'index.js'),
		fs.readFileSync(path.join(__dirname, '../../index.js'))
	);

	const testFile = path.join(target, 'test.js');
	execCli([testFile], {dirname: path.join('fixture', 'ava-paths', 'cwd')}, err => {
		t.ifError(err);
		t.end();
	});
});

test('tests without assertions do not fail if failWithoutAssertions option is set to false', t => {
	execCli([], {dirname: 'fixture/pkg-conf/fail-without-assertions'}, err => {
		t.ifError(err);
		t.end();
	});
});

test('--no-color disables formatting colors', t => {
	execCli(['--no-color', '--verbose', 'formatting-color.js'], (err, stdout) => {
		t.ok(err);
		t.is(stripAnsi(stdout), stdout);
		t.end();
	});
});

test('--color enables formatting colors', t => {
	execCli(['--color', '--verbose', 'formatting-color.js'], (err, stdout) => {
		t.ok(err);
		t.isNot(stripAnsi(stdout), stdout);
		t.end();
	});
});

test('sets NODE_ENV to test when it is not set', t => {
	execCli('node-env-test.js', {env: {}}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('doesn\'t set NODE_ENV when it is set', t => {
	execCli('node-env-foo.js', {env: {NODE_ENV: 'foo'}}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('additional arguments are forwarded to the worker', t => {
	execCli(['worker-argv.js', '--serial', '--', '--hello', 'world'], err => {
		t.ifError(err);
		t.end();
	});
});

test('--reset-cache resets cache', t => {
	const cacheDir = path.join(__dirname, '..', 'fixture', 'reset-cache', 'node_modules', '.cache', 'ava');
	execCli([], {dirname: 'fixture/reset-cache'}, err => {
		t.ifError(err);
		t.true(fs.readdirSync(cacheDir).length > 0);

		execCli(['--reset-cache'], {dirname: 'fixture/reset-cache'}, err => {
			t.ifError(err);
			t.true(fs.readdirSync(cacheDir).length === 0);
			t.end();
		});
	});
});
