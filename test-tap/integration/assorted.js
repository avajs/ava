import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';

import ciInfo from 'ci-info';
import {test} from 'tap';

import {shuffle, testOrderSeed} from '../../lib/test-order.js';
import {execCli} from '../helper/cli.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

test('timeout', {skip: ciInfo.isCI}, t => {
	execCli(['long-running.js', '-T', '1s'], (error, stdout) => {
		t.ok(error);
		t.match(stdout, /Timed out/);
		t.end();
	});
});

test('interrupt', {skip: ciInfo.isCI}, t => {
	const proc = execCli(['long-running.js'], (_, stdout) => {
		t.match(stdout, /SIGINT/);
		t.end();
	});

	setTimeout(() => {
		proc.kill('SIGINT');
	}, 2000);
});

test('include anonymous functions in error reports', t => {
	execCli('error-in-anonymous-function.js', (error, stdout) => {
		t.ok(error);
		t.match(stdout, /error-in-anonymous-function\.js:4:8/);
		t.end();
	});
});

test('--match works', t => {
	execCli(['-m=foo', '-m=bar', '-m=!baz', '-m=t* a* f*', '-m=!t* a* n* f*', 'matcher-skip.js'], error => {
		t.error(error);
		t.end();
	});
});

for (const tapFlag of ['--tap', '-t']) {
	test(`${tapFlag} should produce TAP output`, t => {
		execCli([tapFlag, 'test.js'], {dirname: 'fixture/tap'}, error => {
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
	childProcess.execFile(process.execPath, [path.resolve(__dirname, '../../entrypoints/main.js')], error => {
		t.ok(error);
		t.match(error.message, /Test files must be run with the AVA CLI/);
		t.end();
	});
});

test('tests without assertions do not fail if failWithoutAssertions option is set to false', t => {
	execCli([], {dirname: 'fixture/package-config/fail-without-assertions'}, error => {
		t.error(error);
		t.end();
	});
});

test('--no-color disables formatting colors', t => {
	execCli(['--no-color', 'formatting-color.js'], (error, stdout) => {
		t.ok(error);
		t.equal(stripVTControlCharacters(stdout), stdout);
		t.end();
	});
});

test('--color enables formatting colors', t => {
	execCli(['--color', 'formatting-color.js'], (error, stdout) => {
		t.ok(error);
		t.not(stripVTControlCharacters(stdout), stdout);
		t.end();
	});
});

test('sets NODE_ENV to test when it is not set', t => {
	execCli('node-env-test.js', {env: {}}, (error, stdout) => {
		t.error(error);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('doesn’t set NODE_ENV when it is set', t => {
	execCli('node-env-foo.js', {env: {NODE_ENV: 'foo'}}, (error, stdout) => {
		t.error(error);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('additional arguments are forwarded to the worker', t => {
	execCli(['worker-argv.js', '--serial', '--', '--hello', 'world'], error => {
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

test('selects .js test files', t => {
	execCli('js.js', (error, stdout) => {
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

test('--seed reproduces file order even when failed-test cache changes', t => {
	const fixtureDir = path.join(__dirname, '..', 'fixture', 'sort-tests');
	const cacheDir = path.join(fixtureDir, 'node_modules', '.cache', 'ava');
	const cacheFile = path.join(cacheDir, 'failing-tests.json');
	const file0 = path.join(fixtureDir, '0.js');
	const file1 = path.join(fixtureDir, '1.js');

	const runWithCache = failedFile => new Promise((resolve, reject) => {
		fs.mkdirSync(cacheDir, {recursive: true});
		fs.writeFileSync(cacheFile, JSON.stringify([failedFile]));

		execCli(['--tap', '--seed=ava-seed'], {
			dirname: 'fixture/sort-tests',
			env: {AVA_FORCE_CI: 'not-ci'},
		}, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}

			resolve([...stdout.matchAll(/^ok \d+ - (\d+) ›/gm)].map(([, file]) => file));
		});
	});

	runWithCache(file0)
		.then(firstOrder => runWithCache(file1).then(secondOrder => [firstOrder, secondOrder]))
		.then(([firstOrder, secondOrder]) => {
			t.strictSame(firstOrder, secondOrder);
			t.end();
		}, error => {
			t.error(error);
			t.end();
		});
});

test('--seed randomizes test order and reports the seed', t => {
	const seed = 'ava-seed';
	const testFile = path.join(__dirname, '..', 'fixture', 'randomize-tests', 'test.js');
	const titles = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
	const expectedTitles = shuffle(titles, testOrderSeed(seed, testFile));

	t.notSame(expectedTitles, titles);

	execCli(['--seed=ava-seed', 'randomize-tests/test.js'], (error, stdout) => {
		t.error(error);
		t.match(stdout, /Random seed: ava-seed/);
		t.match(stdout, new RegExp(expectedTitles.join(String.raw`[\s\S]+?`)));
		t.end();
	});
});

test('--randomize reports a generated seed', t => {
	execCli(['--randomize', 'randomize-tests/test.js'], (error, stdout) => {
		t.error(error);
		t.match(stdout, /Random seed: [\da-f]{16}/);
		t.end();
	});
});
