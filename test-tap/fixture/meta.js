const {default: test, meta} = require('../..');

test('meta.file', t => {
	t.is(meta.file, __filename);
});

test('test.meta.file', t => {
	t.is(test.meta.file, __filename);
});
