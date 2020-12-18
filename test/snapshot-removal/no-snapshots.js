const test = require('@ava/test');
const exec = require('../helpers/exec');
const path = require('path');

test('removing non-existent snapshots doesn\'t throw', async t => {
	// Execute fixture; this should try to unlink the nonexistent snapshots, and
	// should not throw
	const run = exec.fixture(['--update-snapshots'], {
		cwd: exec.cwd(path.parse(__filename).name),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	});

	await t.notThrowsAsync(run);
});
