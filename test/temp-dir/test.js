import fs from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {fixture, resolveFixtureDirectory} from '../helpers/exec.js';

const options = {
	// Temporary state is only stored when not in CI, so trick AVA into believing
	// it is not in CI even when it's being tested by AVA's CI.
	env: {AVA_FORCE_CI: 'not-ci'},
};

test.serial('tempDir is used instead of node_modules/.cache/ava', async t => {
	const cwd = resolveFixtureDirectory();
	fs.rmSync(path.join(cwd, '.ava'), {force: true, recursive: true});
	fs.rmSync(path.join(cwd, 'node_modules'), {force: true, recursive: true});

	await t.throwsAsync(fixture([], options));

	t.true(fs.existsSync(path.join(cwd, '.ava', 'failing-tests.json')));
	t.false(fs.existsSync(path.join(cwd, 'node_modules')));

	await fixture(['reset-cache'], options);

	t.false(fs.existsSync(path.join(cwd, '.ava', 'failing-tests.json')));
});

test('unknown tempDir values are rejected', async t => {
	const result = await t.throwsAsync(fixture(['--config', 'unknown-temp-dir.js'], options));

	t.regex(result.stderr, /Unexpected ’tempDir’ value ’custom’, expected one of: ’\.ava’/);
});
