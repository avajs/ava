import test from 'ava';

test('meta.file', t => {
	t.is(test.meta.file, import.meta.url);
});

test('meta.snapshotDirectory', t => {
	const {meta} = test;
	t.true(meta.snapshotDirectory.startsWith('file://'));
	t.regex(meta.snapshotDirectory, /snapshot-fixture/);
});

