const exec = require('../../helpers/exec');
const path = require('path');
const fs = require('fs').promises;

async function beforeAndAfter(t, options, implementation, ...args) {
	const {
		cwd,
		before: {
			env: beforeEnv = {},
			cli: beforeCli = []
		} = {},
		after: {
			env: afterEnv = {},
			cli: afterCli = []
		} = {}
	} = options;

	const baseEnv = {
		AVA_FORCE_CI: 'not-ci'
	};

	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.md')));
	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.snap')));

	const before = {
		result: await exec.fixture(beforeCli, {cwd, env: {TEMPLATE: 'true', ...baseEnv, ...beforeEnv}}),
		...await readSnapshots(cwd)
	};

	const after = {
		result: await exec.fixture(afterCli, {cwd, env: {...baseEnv, ...afterEnv}}),
		...await readSnapshots(cwd)
	};

	await implementation(t, {before, after}, ...args);
}

exports.beforeAndAfter = beforeAndAfter;

async function readSnapshots(cwd) {
	return {
		snapshot: await fs.readFile(path.join(cwd, 'test.js.snap')),
		report: await fs.readFile(path.join(cwd, 'test.js.md'), 'utf8')
	};
}
