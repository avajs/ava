import fs from 'node:fs';
import path from 'node:path';

import test from '@ava/test';
import {temporaryDirectory} from 'tempy';

import {cwd, fixture} from '../helpers/exec.js';

test('formats errors from ava.config.js', async t => {
	const options = {
		cwd: cwd('config-errors'),
	};

	const result = await t.throwsAsync(fixture(['test.js'], options));

	const lines = result.stderr.split('\n');
	while (lines.length > 1 && lines[0] !== '') { // Strip VS Code debugger prefixes.
		lines.shift();
	}

	t.regex(lines[1], /Error loading ava\.config\.js:/);
	t.is(lines[2], '');
	t.regex(lines[3], /foo/);
});

test('works as expected when run from the package.json directory', async t => {
	const options = {
		cwd: cwd('pkg-with-tests'),
	};

	const result = await fixture([], options);

	t.snapshot(result.stats.passed, 'resolves test files from configuration');
});

test('resolves tests from the package.json dir if none are specified on cli', async t => {
	const options = {
		cwd: cwd('pkg-with-tests/dir-a-wrapper'),
	};

	const result = await fixture([], options);

	t.snapshot(result.stats.passed, 'resolves test files from configuration');
});

test('resolves tests from an .mjs config file', async t => {
	const options = {
		cwd: cwd('mjs-with-tests/dir-a-wrapper'),
	};

	const result = await fixture([], options);

	t.snapshot(result.stats.passed, 'resolves test files from configuration');
});

test('looks for config files outside of project directory', async t => {
	const options = {
		cwd: cwd('monorepo/package'),
	};

	const result = await fixture([], options);

	t.snapshot(result.stats.passed, 'resolves test files from configuration');
});

test('use current working directory if `package.json` is not found', async t => {
	const cwd = temporaryDirectory();
	const testFilePath = path.join(cwd, 'test.js');

	fs.writeFileSync(testFilePath, 'const test = require(process.env.TEST_AVA_IMPORT_FROM);\ntest(\'test name\', t => { t.pass(); });');

	const options = {
		cwd,
	};

	const result = await fixture([], options);

	t.snapshot(result.stats.passed, 'resolves test files without configuration');
});
