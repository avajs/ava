const path = require('path');
const {test} = require('tap');
const {execCli} = require('../helper/cli');

const sharedArgs = ['--single-process'];

test('timeout in single-process', t => {
	execCli(['long-running.js', '-T', '1s', ...sharedArgs], (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Timed out/);
		t.end();
	});
});

test('include anonymous functions in error reports in single-process', t => {
	execCli(['error-in-anonymous-function.js', ...sharedArgs], (err, stdout) => {
		t.ok(err);
		t.match(stdout, /error-in-anonymous-function\.js:4:8/);
		t.end();
	});
});

for (const tapFlag of ['--tap', '-t']) {
	test(`${tapFlag} should produce TAP output in single-process`, t => {
		execCli([tapFlag, 'test.js'], {dirname: 'fixture/watcher'}, err => {
			t.ok(!err);
			t.end();
		});
	});
}

test('handles NODE_PATH in single-process', t => {
	const nodePaths = `node-paths/modules${path.delimiter}node-paths/deep/nested`;

	execCli('node-paths.js', {env: {NODE_PATH: nodePaths}}, err => {
		t.ifError(err);
		t.end();
	});
});

test('works when no files are found in sinle-process', t => {
	execCli('!*', (err, stdout) => {
		t.is(err.code, 1);
		t.match(stdout, 'Couldn\'t find any files to test');
		t.end();
	});
});

test('throws error when ava is not imported in file in single-process', t => {
	execCli(['missing-ava-import.js', ...sharedArgs], (err, stdout) => {
		t.is(err.code, 1);
		t.match(stdout, 'make sure to import "ava" at the top of your test file');
		t.end();
	});
});

test('async/await support in single-process', t => {
	execCli(['async-await.js', ...sharedArgs], (err, stdout) => {
		t.is(err, 0);
		t.match(stdout, '2 tests passed');
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown too slowly, will be reported to the console in single-process', t => {
	execCli(['caught-and-leaked-too-slowly.js', ...sharedArgs], {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('catches uncaught-exception in single-process', t => {
	execCli(['report/edge-cases/throws.js', ...sharedArgs], (err, stdout) => {
		t.is(err.code, 1);
		t.match(stdout, /Uncaught exception in/);
		t.end();
	});
});

test('catches unhandled-rejection in single-process', t => {
	execCli(['improper-t-throws/unhandled-rejection.js', ...sharedArgs], (err, stdout) => {
		t.is(err.code, 1);
		t.match(stdout, /message: 'should be detected',/);
		t.end();
	});
});

test('fail-fast multiple files in single-process', t => {
	execCli(['fail-fast/multiple-files', '--fail-fast', ...sharedArgs], (err, stdout) => {
		t.is(err.code, 1);
		t.match(stdout, /`--fail-fast` is on\. 3 test files were skipped\./);
		t.end();
	});
});

test('supports esm in single-process', t => {
	execCli(['test.js', ...sharedArgs], {dirname: 'fixture/esm-config-pkg'}, (err, stdout) => {
		t.is(err, 0);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});
