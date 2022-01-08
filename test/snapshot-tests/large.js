import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

// Reproduction for https://github.com/avajs/ava/issues/2932.
test('can encode and decode large snapshots', async t => {
	await withTemporaryFixture(cwd('large'), async cwd => {
		const env = {
			AVA_FORCE_CI: 'not-ci',
		};
		await fixture(['--update-snapshots'], {cwd, env});
		await t.notThrowsAsync(fixture([], {cwd, env}));
	});
});
