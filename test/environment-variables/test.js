const test = require('@ava/test');
const exec = require('../helpers/exec');

test('sets default environment variables from the config', async t => {
	const results = await exec.fixture(['environment-variables.js'], {
		cwd: exec.cwd('environment-variables')
	});

	t.is(results.stats.passed.length, 1);
});

test('overrides environment variables provided through the CLI', async t => {
	const env = {
		MY_ENVIRONMENT_VARIABLE: 'some value (updated)'
	};

	const results = await exec.fixture(['environment-variables.js'], {
		env,
		cwd: exec.cwd('environment-variables')
	});

	t.is(results.stats.passed.length, 1);
});

test('errors if environment variables are not string values', async t => {
	return t.throwsAsync(exec.fixture(['environment-variables.js'], {
		cwd: exec.cwd('invalid-environment-variables')
	}), {
		message: /The ’environmentVariables’ configuration must be an object containing string values./
	});
});
