import process from 'node:process';

import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

const snapshotStdout = (t, stdout) => {
	const normalized = stdout
		.replaceAll('\r', '')
		.replaceAll(/\/{3}/g, '//')
		.replaceAll(/(\b)at.*\n/g, '$1at ---\n');

	t.snapshot(normalized);
};

for (const [label, selector] of Object.entries({
	'^22.20': /^22\.(2\d\.|[3-9]\d\.)/,
	'^24.12': /^24\.(1[2-9]\.|[2-9]\d\.)/,
	'^25': /^25\./,
})) {
	// Tests need to be declared for all versions, so that snapshots can be
	// updated by running `npx test-ava -u test/external-assertions/test.js` for
	// each supported version. However only the tests for the current version
	// can run, so skip the others.
	const run = selector.test(process.versions.node);

	test.runIf(run)(`node assertion (${label})`, async t => {
		const result = await t.throwsAsync(fixture(['assert-failure.js']));
		snapshotStdout(t, result.stdout);
	});

	test.runIf(run)(`expect error (${label})`, async t => {
		const result = await t.throwsAsync(fixture(['expect-failure.js']));
		snapshotStdout(t, result.stdout);
	});
}
