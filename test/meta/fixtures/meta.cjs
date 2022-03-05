const url = require('url');

// @ts-ignore
const test = require('ava');

// @ts-ignore
test('meta.file', t => {
	// @ts-ignore
	t.is(test.meta.file, url.pathToFileURL(__filename).toString());
});

// @ts-ignore
test('meta.snapshotDirectory', t => {
	// @ts-ignore
	const {meta} = test;
	t.true(meta.snapshotDirectory.startsWith('file://'));
	t.regex(meta.snapshotDirectory, /snapshot-fixture/);
});

