import test from '@ava/test';

import {fixture, resolveFixtureDirectory} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

const run = async (fixtureName, cli) => withTemporaryFixture(resolveFixtureDirectory(fixtureName), async cwd => {
	const result = await fixture(cli, {cwd, env: {AVA_FORCE_CI: 'not-ci'}});
	return result.stdout;
});

test.serial('--update-snapshots reports updated snapshots', async t => {
	const stdout = await run('changing-label', ['--update-snapshots']);
	t.regex(stdout, /^\s*1 snapshot updated/m);
	t.notRegex(stdout, /snapshots? removed/);
});

test.serial('--update-snapshots reports removed snapshots', async t => {
	const stdout = await run('removing-snapshots', ['--update-snapshots']);
	t.regex(stdout, /^\s*1 snapshot removed/m);
	t.notRegex(stdout, /snapshots? updated/);
});

test.serial('snapshot changes are not reported without --update-snapshots', async t => {
	const stdout = await run('removing-snapshots', []);
	t.notRegex(stdout, /snapshots? (updated|removed)/);
});
