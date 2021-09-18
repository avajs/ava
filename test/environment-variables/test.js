import test from '@ava/test';

import {cleanOutput, cwd, fixture} from '../helpers/exec.js';

test('sets default environment variables from the config', async t => {
	const options = {
		cwd: cwd('environment-variables'),
	};

	const results = await fixture(['environment-variables.js'], options);

	t.snapshot(results.stats.passed, 'tests pass');
});

test('overrides environment variables provided through the CLI', async t => {
	const options = {
		cwd: cwd('environment-variables'),
		env: {
			MY_ENVIRONMENT_VARIABLE: 'some value (updated)',
		},
	};

	const results = await fixture(['environment-variables.js'], options);

	t.snapshot(results.stats.passed, 'tests pass');
});

test('errors if environment variables are not string values', async t => {
	const options = {
		cwd: cwd('invalid-environment-variables'),
	};

	const result = await t.throwsAsync(fixture(['environment-variables.js'], options));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});
