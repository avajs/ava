const test = require('../../entrypoints/main.cjs');

test('meta.file', t => {
	t.is(test.meta.file, __filename);
});

test('meta.snapshotDirectory', t => {
	t.regex(test.meta.snapshotDirectory, /snapshot-fixture/);
});

