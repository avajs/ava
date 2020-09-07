const test = require('@ava/test');
const exec = require('../helpers/exec');

test('sets default environment variables from the config', async t => {
	const options = {
		cwd: exec.cwd('environment-variables')
	};

	const results = await exec.fixture(['environment-variables.js'], options);

	t.snapshot(results.stats.passed, 'tests pass');
});

test('overrides environment variables provided through the CLI', async t => {
	const options = {
		cwd: exec.cwd('environment-variables'),
		env: {
			MY_ENVIRONMENT_VARIABLE: 'some value (updated)'
		}
	};

	const results = await exec.fixture(['environment-variables.js'], options);

	t.snapshot(results.stats.passed, 'tests pass');
});

test('errors if environment variables are not string values', async t => {
	const options = {
		cwd: exec.cwd('invalid-environment-variables')
	};

	const result = await t.throwsAsync(exec.fixture(['environment-variables.js'], options));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});
