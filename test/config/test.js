const fs = require('fs');
const path = require('path');
const tempy = require('tempy');
const test = require('@ava/test');
const exec = require('../helpers/exec');

test('formats errors from ava.config.js', async t => {
	const result = await t.throwsAsync(exec.fixture(['test.js'], {
		cwd: exec.cwd('config-errors')
	}));

	const lines = result.stderr.split('\n');

	t.is(lines[0], '');
	t.regex(lines[1], /Error loading ava\.config\.js:/);
	t.is(lines[2], '');
	t.regex(lines[3], /ava\.config\.js/);
	t.regex(lines[4], /foo/);
});

test('pkg-conf(resolve-dir): works as expected when run from the package.json directory', async t => {
	const result = await exec.fixture([], {
		cwd: exec.cwd('resolve-pkg-dir')
	});

	t.regex(result.stdout, /dir-a-base-1/);
	t.regex(result.stdout, /dir-a-base-2/);
	t.notRegex(result.stdout, /dir-a-wrapper/);
	t.notRegex(result.stdout, /dir-a-wrapper/);
});

test('pkg-conf(resolve-dir): resolves tests from the package.json dir if none are specified on cli', async t => {
	const result = await exec.fixture(['--verbose'], {
		cwd: exec.cwd('resolve-pkg-dir/dir-a-wrapper')
	});

	t.regex(result.stdout, /dir-a-base-1/);
	t.regex(result.stdout, /dir-a-base-2/);
	t.notRegex(result.stdout, /dir-a-wrapper/);
	t.notRegex(result.stdout, /dir-a-wrapper/);
});

test('use current working directory if `package.json` is not found', async t => {
	const cwd = tempy.directory();
	const testFilePath = path.join(cwd, 'test.js');
	const avaPath = require.resolve('../../');

	fs.writeFileSync(testFilePath, `const test = require(${JSON.stringify(avaPath)});\ntest('test name', t => { t.pass(); });`);

	const result = await exec.fixture([], {
		cwd
	});

	t.regex(result.stdout, /test name/);
});
