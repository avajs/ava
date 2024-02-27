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
	'^18': /^18\./,
	'^20 < 20.11': /^20\.(\d\.|10\.)/,
	'^20.11': /^20\.(1[1-9]\.|[2-9]\d\.)/,
	'^21': /^21\./,
})) {
	// Tests need to be declared for all versions, so that snapshots can be
	// updated by running `npx test-ava -u test/external-assertions/test.js` for
	// each supported version. However only the tests for the current version
	// can run, so skip the others.
	const declare = selector.test(process.versions.node) ? test : test.skip;

	declare(`node assertion (node.js v${label})`, async t => {
		const result = await t.throwsAsync(fixture(['assert-failure.js']));
		snapshotStdout(t, result.stdout);
	});

	declare(`expect error (node.js v${label})`, async t => {
		const result = await t.throwsAsync(fixture(['expect-failure.js']));
		snapshotStdout(t, result.stdout);
	});
}
