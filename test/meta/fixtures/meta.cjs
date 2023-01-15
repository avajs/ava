const url = require('node:url');

const test = require('ava');

test('meta.file', t => {
	t.is(test.meta.file, url.pathToFileURL(__filename).toString());
});

test('meta.snapshotDirectory', t => {
	const {meta} = test;
	t.true(meta.snapshotDirectory.startsWith('file://'));
	t.regex(meta.snapshotDirectory, /snapshot-fixture/);
});

