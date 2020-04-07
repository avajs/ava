const {default: test, meta} = require('../..');

test('meta is test.meta', t => {
	t.is(meta, test.meta);
});

test('meta.file', t => {
	t.is(meta.file, __filename);
});

test('meta.snapshotDirectory', t => {
	t.regex(meta.snapshotDirectory, /.*snapshot-fixture.*/);
});

