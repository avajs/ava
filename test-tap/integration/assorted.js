import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import ciInfo from 'ci-info';
import stripAnsi from 'strip-ansi';
import {test} from 'tap';

import {execCli} from '../helper/cli.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

test('timeout', {skip: ciInfo.isCI}, t => {
	execCli(['long-running.cjs', '-T', '1s'], (error, stdout) => {
		t.ok(error);
		t.match(stdout, 'helpful log of a pending test');
		t.match(stdout, /Timed out/);
		t.end();
	});
});

test('interrupt', {skip: ciInfo.isCI}, t => {
	const proc = execCli(['long-running.cjs'], (_, stdout) => {
		t.match(stdout, 'helpful log of a pending test');
		t.match(stdout, /SIGINT/);
		t.end();
	});

	setTimeout(() => {
		proc.kill('SIGINT');
	}, 2000);
});

test('include anonymous functions in error reports', t => {
	execCli('error-in-anonymous-function.cjs', (error, stdout) => {
		t.ok(error);
		t.match(stdout, /error-in-anonymous-function\.cjs:4:8/);
		t.end();
	});
});

test('--match works', t => {
	execCli(['-m=foo', '-m=bar', '-m=!baz', '-m=t* a* f*', '-m=!t* a* n* f*', 'matcher-skip.cjs'], error => {
		t.error(error);
		t.end();
	});
});

for (const tapFlag of ['--tap', '-t']) {
	test(`${tapFlag} should produce TAP output`, t => {
		execCli([tapFlag, 'test.cjs'], {dirname: 'fixture/watcher'}, error => {
			t.ok(!error);
			t.end();
		});
	});
}

test('works when no files are found', t => {
	execCli([], {dirname: 'fixture/globs/no-files'}, (error, stdout) => {
		t.equal(error.code, 1);
		t.match(stdout, 'Couldn’t find any files to test');
		t.end();
	});
});

test('should warn ava is required without the cli', t => {
	childProcess.execFile(process.execPath, [path.resolve(__dirname, '../../entrypoints/main.cjs')], error => {
		t.ok(error);
		t.match(error.message, /Test files must be run with the AVA CLI/);
		t.end();
	});
});

test('tests without assertions do not fail if failWithoutAssertions option is set to false', t => {
	execCli([], {dirname: 'fixture/pkg-conf/fail-without-assertions'}, error => {
		t.error(error);
		t.end();
	});
});

test('--no-color disables formatting colors', t => {
	execCli(['--no-color', 'formatting-color.cjs'], (error, stdout) => {
		t.ok(error);
		t.equal(stripAnsi(stdout), stdout);
		t.end();
	});
});

test('--color enables formatting colors', t => {
	execCli(['--color', 'formatting-color.cjs'], (error, stdout) => {
		t.ok(error);
		t.not(stripAnsi(stdout), stdout);
		t.end();
	});
});

test('sets NODE_ENV to test when it is not set', t => {
	execCli('node-env-test.cjs', {env: {}}, (error, stdout) => {
		t.error(error);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('doesn’t set NODE_ENV when it is set', t => {
	execCli('node-env-foo.cjs', {env: {NODE_ENV: 'foo'}}, (error, stdout) => {
		t.error(error);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('additional arguments are forwarded to the worker', t => {
	execCli(['worker-argv.cjs', '--serial', '--', '--hello', 'world'], error => {
		t.error(error);
		t.end();
	});
});

test('reset-cache resets cache', t => {
	const cacheDir = path.join(__dirname, '..', 'fixture', 'reset-cache', 'node_modules', '.cache', 'ava');
	fs.mkdirSync(cacheDir, {recursive: true});
	fs.writeFileSync(path.join(cacheDir, 'file'), '');
	t.ok(fs.readdirSync(cacheDir).length > 0);

	execCli(['reset-cache'], {dirname: 'fixture/reset-cache'}, error => {
		t.error(error);
		t.ok(fs.readdirSync(cacheDir).length === 0);
		t.end();
	});
});

test('selects .cjs test files', t => {
	execCli('cjs.cjs', (error, stdout) => {
		t.error(error);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('load .mjs test files', t => {
	execCli('mjs.mjs', (error, stdout) => {
		t.error(error);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('load .js test files as ESM modules', t => {
	execCli('test.js', {dirname: 'fixture/pkg-type-module'}, (error, stdout) => {
		t.error(error);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('uses sortTestFiles to sort test files', t => {
	execCli([], {dirname: 'fixture/sort-tests'}, (error, stdout) => {
		t.error(error);
		t.match(stdout, /should run first[\s\S]+?should run second[\s\S]+?should run third/);
		t.end();
	});
});
