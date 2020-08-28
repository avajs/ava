const test = require('@ava/test');
const exec = require('../helpers/exec');

test('sets default environment variables from the config', async t => {
	const options = {
		cwd: exec.cwd('environment-variables')
	};

	const results = await exec.fixture(['environment-variables.js'], options);

	t.is(results.stats.passed.length, 1);
});

test('overrides environment variables provided through the CLI', async t => {
	const options = {
		cwd: exec.cwd('environment-variables'),
		env: {
			MY_ENVIRONMENT_VARIABLE: 'some value (updated)'
		}
	};

	const results = await exec.fixture(['environment-variables.js'], options);

	t.is(results.stats.passed.length, 1);
});

test('errors if environment variables are not string values', async t => {
	const options = {
		cwd: exec.cwd('invalid-environment-variables')
	};

	await t.throwsAsync(exec.fixture(['environment-variables.js'], options), {
		message: /The ’environmentVariables’ configuration must be an object containing string values./
	});
});
