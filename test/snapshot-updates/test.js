const test = require('@ava/test');

const exec = require('../helpers/exec');
const path = require('path');
const tempy = require('tempy');
const fs = require('fs').promises;
const fse = require('fs-extra');
const YARGS_PATH = require.resolve('yargs');

async function withConfigurableFixture(t, implementation) {
	await tempy.directory.task(async temporaryDir => {
		await fse.copy(exec.cwd('configurable'), temporaryDir);
		await implementation(t, temporaryDir);
	});
}

test('First run generates a .snap and a .md', withConfigurableFixture, async (t, cwd) => {
	const env = {
		AVA_FORCE_CI: 'not-ci',
		YARGS_PATH
	};
	const config = [
		'--0.1.message="a message"',
		'--2.0.message="another message"'
	];

	await exec.fixture(['--', ...config], {cwd, env});

	await t.notThrowsAsync(fs.access(path.join(cwd, 'test.js.snap')));
	t.snapshot(await fs.readFile(path.join(cwd, 'test.js.md'), 'utf8'), 'snapshot report');
});

test.todo('Adding more snapshots to a test adds them to the .snap and .md');
test.todo('Adding a test with snapshots adds them to the .snap and .md');
test.todo('Changing a snapshot\'s label does not change the .snap or .md');
test.todo('With --update-snapshots, changing a snapshot\'s label updates the .snap and .md');
test.todo('Changing a test\'s title adds a new block, puts the old block at the end');
test.todo('Reordering tests does not change the .snap or .md');
test.todo('With --update-snapshots, reordering tests reorders the .snap and .md');
test.todo('Removing a snapshot assertion retains its data');
test.todo('With --update-snapshots, removing a snapshot assertion removes its data');
test.todo('Removing all snapshots from a test retains its data');
test.todo('With --update-snapshots, removing all snapshots from a test removes the block');
test.todo('Removing a test retains its data');
test.todo('With --update-snapshots, removing a test removes its block');
test.todo('Removing all snapshots from a file retains the .snap, .md');
