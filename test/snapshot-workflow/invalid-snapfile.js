const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs').promises;
const path = require('path');
const {withTemporaryFixture} = require('../helpers/with-temporary-fixture');

test.serial('With invalid .snap file and --update-snapshots, skipped snaps are omitted', async t => {
	await withTemporaryFixture(exec.cwd('invalid-snapfile'), async cwd => {
		const env = {AVA_FORCE_CI: 'not-ci'};
		const snapPath = path.join(cwd, 'test.js.snap');
		const reportPath = path.join(cwd, 'test.js.md');

		await fs.writeFile(snapPath, Buffer.of(0x0A, 0x00, 0x00));

		const result = await exec.fixture(['--update-snapshots'], {cwd, env});
		const report = await fs.readFile(reportPath, 'utf8');

		t.snapshot(report, 'snapshot report');
		t.snapshot(result.stats.passed, 'passed tests');
		t.snapshot(result.stats.failed, 'failed tests');
		t.snapshot(result.stats.skipped, 'skipped tests');
	});
});
